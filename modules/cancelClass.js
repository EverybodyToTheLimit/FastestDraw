const { chromium } = require('playwright');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const cancelClass = async ({booking}) => {

    // Launch a headless Chromium browser
    const browser = await chromium.launch();

    // Increase default timeout
    const DEFAULT_TIMEOUT = 30000; // 30 seconds

    // Create a new browser context
    const context = await browser.newContext({
        navigationTimeout: DEFAULT_TIMEOUT,
    });

    // Open a new page within the context
    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    try {
        const {className, startTime} = booking
        // Navigate to a website with explicit timeout
        await page.goto(process.env.WEBSITE, {timeout: DEFAULT_TIMEOUT, waitUntil: 'networkidle'});

        if (!className) {
            throw new Error("Class name is required");
        }
        else if (!startTime) {
            throw new Error("Start time is required");
        }

        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.getByRole('navigation').getByRole('link', { name: /members/i }).click({ force: true })
        ]);
        
        await page.locator('#userSigninLogin').fill(process.env.USERNAME);
        await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
        
        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.getByRole('button', { name: 'Sign in' }).click({ force: true })
        ]);
        
        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.getByRole('link', { name: 'Book classes' }).click({ force: true })
        ]);
        
        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.getByRole('link', { name: offsetBookingDate(0) }).click({ force: true })
        ]);
        let button;
        let retries = 3;
        while (retries > 0) {
            try {
                button = await page
                    .locator('.class')
                    .filter({ hasText: className })
                    .filter({ hasText: startTime })
                    .getByRole('button')
                    .waitFor({ timeout: DEFAULT_TIMEOUT });
                break; // Success, exit the loop
            } catch (e) {
                retries--;
                if (retries === 0) {
                    await page.screenshot({path: `error-screenshot-${Date.now()}.png`, fullPage: true});
                    throw new Error(`Could not find the cancel button after multiple attempts: ${e.message}`);
                }
                console.log(`Retrying cancel button detection (${retries} attempts left)`);
                await page.waitForTimeout(2000); // Wait 2 seconds before retrying
            }
        }
        const buttonValue = await button.evaluate(node => node.textContent);
        if (buttonValue !== 'Cancel Waitinglist' && buttonValue !== 'Cancel Booking') {
            throw new Error("The button is neither Cancel Waitinglist nor Cancel Booking");
        }
        page.on('dialog', dialog => dialog.accept());
        await button.click({force: true});
        await page.waitForTimeout(2000); // Wait a bit after clicking
        const response = { bookingType: buttonValue };

        // Close the browser
        await browser.close();

        return response;
    } catch (error) {
        // Close the browser in case of an error
        await browser.close();
        throw error;
    }
}

module.exports = cancelClass;
