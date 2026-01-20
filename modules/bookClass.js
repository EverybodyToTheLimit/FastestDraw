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

        const allCards = page.locator('div.class.grid');
        const count = await allCards.count();
        let targetCard = null;

        console.log(`Found ${count} class cards. Scanning for match...`);

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
            throw new Error(`Could not find a class card with Name: "${className}" and Time: "${startTime}"`);
        }

        const button = targetCard.locator('button');
        
        if (await button.isVisible()) {
            const buttonText = await button.innerText();
            console.log(`Found button: "${buttonText}"`);

            const upperText = buttonText.toUpperCase();

            if (upperText.includes('SIGN UP')) {
                console.log("Clicking 'Sign Up'...");
                await button.click();
                await button.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
                    console.log("Button did not disappear, but continuing...");
                });
                return { bookingType: "BROWSER_CLICKED" };
            } 
            else if (upperText.includes('WAITINGLIST')) {
                 console.log("Class full. Clicking 'Join Waitinglist'...");
                 await button.click();
                 return { bookingType: "WAITING_LIST" };
            }
            else if (upperText.includes('CANCEL')) {
                console.log("Already booked. No action taken.");
                return { bookingType: "ALREADY_BOOKED" };
            }
            else {
                console.log(`Unknown button text: ${buttonText}`);
                throw new Error(`Unexpected button state: ${buttonText}`);
            }
        } else {
            const errorMsg = await targetCard.locator('.message.error').innerText().catch(() => '');
            if (errorMsg) {
                console.log(`Class is unbookable: ${errorMsg}`);
                throw new Error(`Class unavailable: ${errorMsg}`);
            }
            throw new Error("Class found, but no actionable button visible.");
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