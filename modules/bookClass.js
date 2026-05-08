const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const { findClassCard } = require('../helpers/matchClassCard');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const bookClass = async ({ className, startTime }) => {
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE) && fs.statSync(SESSION_FILE).size > 2) {
            context = await browser.newContext({ storageState: SESSION_FILE });
        } else {
            console.log("Starting fresh session.");
            context = await browser.newContext();
        }
    } catch (e) {
        context = await browser.newContext();
    }

    const page = await context.newPage();
    const MAX_RETRIES = 3;

    try {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 1) console.log(`\n--- Retry Attempt ${attempt}/${MAX_RETRIES} ---`);

                console.log("Navigating to booking page...");
                await page.goto(process.env.WEBSITE + '/book-classes', { waitUntil: 'domcontentloaded' });

                if (await page.getByRole('button', { name: 'Sign in' }).isVisible()) {
                    console.log("Logging in...");
                    await page.locator('#userSigninLogin').fill(process.env.USERNAME);
                    await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
                    await page.getByRole('button', { name: 'Sign in' }).click();
                    await page.waitForURL(/.*(book-classes|members).*/);
                    await context.storageState({ path: SESSION_FILE });
                }

                const targetDayText = offsetBookingDate(2);
                console.log(`Looking for date: "${targetDayText}"`);
                
                const dayTab = page.locator('#event-booking-date-select a').filter({ hasText: targetDayText }).first();
                
                if (await dayTab.isVisible()) {
                    const parentLi = dayTab.locator('xpath=..');
                    const isActive = await parentLi.getAttribute('class').then(c => c && c.includes('active'));

                    if (!isActive) {
                        console.log(`Clicking ${targetDayText}...`);
                        
                        const responsePromise = page.waitForResponse(response => 
                            response.status() === 200 && 
                            (response.url().includes('book-classes') || response.url().includes('onDate')),
                            { timeout: 15000 }
                        );

                        await dayTab.click();
                        
                        console.log("Waiting for server response...");
                        await responsePromise.catch(() => console.log("⚠️ Response timeout. Checking DOM directly..."));
                        await page.waitForTimeout(500);
                    }
                } else {
                    console.warn(`Tab ${targetDayText} not found. Scanning current page.`);
                }

                console.log(`Scanning for class "${className}" at "${startTime}"...`);
                
                try {
                    await page.locator(`div.class.grid:has-text("${startTime}")`).first().waitFor({ state: 'visible', timeout: 5000 });
                } catch(e) {
                    console.log(`⚠️ No cards with time ${startTime} appeared yet. Continuing to scan...`);
                }

                const allCards = page.locator('div.class.grid');
                const { card: targetCard } = await findClassCard(allCards, { className, startTime });

                const button = targetCard.locator('button');
                if (await button.isVisible()) {
                    console.log("Clicking button...");
                    
                    page.once('dialog', async dialog => {
                        console.log(`Dialog: ${dialog.message()}`);
                        await dialog.accept();
                    });

                    await button.click();
                    await page.waitForTimeout(3000);
                    return { bookingType: "ATTEMPTED_CLICK" };
                } else {
                    throw new Error("Button not visible on target card.");
                }

            } catch (innerError) {
                console.error(`❌ Attempt ${attempt} failed: ${innerError.message}`);
                
                if (attempt === MAX_RETRIES) throw innerError;
                
                console.log("♻️ Reloading page...");
                await page.reload({ waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(2000);
            }
        }

    } catch (error) {
        console.error("Booking Final Error:", error.message);
        try { await page.screenshot({ path: '/opt/app/error_booking.png' }); } catch (e) {}
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = bookClass;