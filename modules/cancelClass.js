const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const offsetBookingDate = require('../helpers/offsetBookingDate');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const cancelClass = async ({ className, startTime }) => {
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE) && fs.statSync(SESSION_FILE).size > 2) {
            console.log("Loading session for cancellation...");
            context = await browser.newContext({ storageState: SESSION_FILE });
        } else {
            console.log("Session file missing. Logging in fresh.");
            context = await browser.newContext();
        }
    } catch (e) {
        console.log("Error loading session:", e.message);
        context = await browser.newContext();
    }

    const page = await context.newPage();

    try {
        console.log("Navigating to booking page...");
        await page.goto(process.env.WEBSITE + '/book-classes', { waitUntil: 'networkidle' });

        if (await page.getByRole('button', { name: 'Sign in' }).isVisible()) {
            console.log("Logging in...");
            await page.locator('#userSigninLogin').fill(process.env.USERNAME);
            await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
            await page.getByRole('button', { name: 'Sign in' }).click();
            await page.waitForURL(/.*book-classes.*/);
            await context.storageState({ path: SESSION_FILE });
        }

        const targetDayText = offsetBookingDate(0); 
        console.log(`Looking for date tab: "${targetDayText}"`);
        const dayTab = page.locator('#event-booking-date-select a').filter({ hasText: targetDayText }).first();

        if (await dayTab.isVisible()) {
            const parentLi = dayTab.locator('xpath=..');
            if (await parentLi.getAttribute('class').then(c => c && c.includes('active'))) {
                console.log(`Date ${targetDayText} is already active.`);
            } else {
                console.log(`Clicking ${targetDayText}...`);
                await dayTab.click();
                await parentLi.waitFor({ state: 'visible' });
                await page.waitForTimeout(2000);
            }
        } else {
            console.warn(`Could not find tab for ${targetDayText}.`);
        }

        console.log(`Searching for class to cancel: "${className}" at "${startTime}"`);

        const allCards = page.locator('div.class.grid');
        const count = await allCards.count();
        let targetCard = null;

        for (let i = 0; i < count; i++) {
            const card = allCards.nth(i);
            const text = await card.innerText(); 
            if (text.includes(className) && text.includes(startTime)) {
                console.log(`✅ Match found in card #${i+1}`);
                targetCard = card;
                break;
            }
        }

        if (!targetCard) {
            throw new Error(`Could not find class "${className}" at "${startTime}" to cancel.`);
        }

        const button = targetCard.locator('button');

        if (await button.isVisible()) {
            const buttonText = await button.innerText();
            console.log(`Found button: "${buttonText}". preparing to click...`);

            page.once('dialog', async dialog => {
                console.log(`🔹 Dialog detected: ${dialog.message()}`);
                await dialog.accept();
                console.log("🔹 Dialog accepted.");
            });

            await button.click();
            
            try {
                await button.waitFor({ state: 'hidden', timeout: 5000 });
                console.log("Cancellation confirmed (button disappeared).");
            } catch (e) {
                console.log("Button did not disappear immediately (might require page reload), but dialog was handled.");
            }

            return { status: "CANCELLED" };

        } else {
            throw new Error("Class found, but no button visible.");
        }

    } catch (error) {
        console.error("Cancellation Error:", error.message);
        await page.screenshot({ path: '/opt/app/error_cancellation.png' });
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = cancelClass;