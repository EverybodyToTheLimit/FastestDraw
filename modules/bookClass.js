const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const offsetBookingDate = require('../helpers/offsetBookingDate');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const bookClass = async ({ className, startTime }) => {
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE) && fs.statSync(SESSION_FILE).size > 2) {
            console.log("Loading session from file...");
            context = await browser.newContext({ storageState: SESSION_FILE });
        } else {
            console.log("Session file missing/empty. Starting fresh.");
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
            console.log("Session saved.");
        }

        const targetDayText = offsetBookingDate(2); 
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

        console.log(`Searching for class: "${className}" at "${startTime}"`);
        const classCard = page.locator('.class').filter({ hasText: className }).filter({ hasText: startTime });
        await classCard.first().waitFor({ state: 'attached', timeout: 5000 });

        const bookButton = classCard.locator('button, input[type="submit"], a.button').first();
        
        if (await bookButton.isVisible()) {
            console.log("Found 'Book' button. Clicking...");
            await bookButton.click();

            try {
                await expect(bookButton).not.toBeVisible({ timeout: 5000 });
                console.log("Booking click registered.");
            } catch (e) {
                console.log("Button click finished (no specific navigation detected).");
            }
            
            return { bookingType: "BROWSER_CLICKED" };
        } else {
            throw new Error("Class found, but no 'Book' button visible (maybe fully booked?).");
        }

    } catch (error) {
        console.error("Booking Error:", error.message);
        await page.screenshot({ path: '/opt/app/error_booking.png' });
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = bookClass;