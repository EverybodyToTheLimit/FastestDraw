const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const offsetBookingDate = require('../helpers/offsetBookingDate');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const bookClass = async ({ className, startTime }) => {
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE)) {
            const stats = fs.statSync(SESSION_FILE);
            if (stats.size > 0) {
                context = await browser.newContext({ storageState: SESSION_FILE });
            } else {
                throw new Error("File is empty");
            }
        } else {
            throw new Error("File does not exist");
        }
    } catch (e) {
        console.log("Session file missing or invalid. Starting fresh context.");
        context = await browser.newContext();
    }

    const page = await context.newPage();
    
    await page.route('**/*.{png,jpg,jpeg,svg,css,woff,woff2}', route => route.abort());

    try {
        await page.goto(process.env.WEBSITE + '/book-classes', { waitUntil: 'domcontentloaded' });

        if (await page.getByRole('button', { name: 'Sign in' }).isVisible()) {
            console.log("Session invalid. Logging in...");
            await page.locator('#userSigninLogin').fill(process.env.USERNAME);
            await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
            await page.getByRole('button', { name: 'Sign in' }).click();
            await page.waitForURL(/.*members.*/);
            

            await context.storageState({ path: SESSION_FILE });
            console.log("New session saved.");
        }

        const targetDate = offsetBookingDate(2);
        if (!page.url().includes(targetDate)) {
            await page.goto(`${process.env.WEBSITE}/book-classes/date/${targetDate}`, { waitUntil: 'domcontentloaded' });
        }

        const classCard = page.locator('.class').filter({ hasText: className }).filter({ hasText: startTime });
        await classCard.first().waitFor({ state: 'attached', timeout: 5000 });

        const bookingId = await classCard.locator('input[name="id"]').getAttribute('value');
        const timestamp = await classCard.locator('input[name="timestamp"]').getAttribute('value');

        if (!bookingId) throw new Error("Class ID not found in DOM");

        const response = await page.request.post(`${process.env.WEBSITE}/book-classes`, {
            form: { id: bookingId, timestamp: timestamp }
        });

        if (!response.ok()) throw new Error(`API Error: ${response.status()}`);

        return { bookingType: "API_BOOKED" };

    } catch (error) {
        await page.screenshot({ path: `error-${Date.now()}.png` });
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = bookClass;