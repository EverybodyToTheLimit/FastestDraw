const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const offsetBookingDate = require('../helpers/offsetBookingDate');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const cancelClass = async ({ booking }) => {
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE)) {
            // Try to load the file
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
        const { className, startTime } = booking;
        
        await page.goto(`${process.env.WEBSITE}/book-classes/date/${offsetBookingDate(0)}`, { waitUntil: 'domcontentloaded' });

        if (await page.getByRole('button', { name: 'Sign in' }).isVisible()) {
            await page.locator('#userSigninLogin').fill(process.env.USERNAME);
            await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
            await page.getByRole('button', { name: 'Sign in' }).click();
            await page.waitForURL(/.*members.*/);
            await context.storageState({ path: SESSION_FILE });
            await page.goto(`${process.env.WEBSITE}/book-classes/date/${offsetBookingDate(0)}`);
        }

        const classCard = page.locator('.class').filter({ hasText: className }).filter({ hasText: startTime });
        const button = classCard.getByRole('button').first();
        
        await button.waitFor();
        const buttonText = await button.innerText();

        page.on('dialog', dialog => dialog.accept());
        
        await button.evaluate(b => b.click());
        await page.waitForTimeout(1000);

        return { bookingType: `CANCELLED (${buttonText})` };

    } catch (error) {
        await browser.close();
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = cancelClass;