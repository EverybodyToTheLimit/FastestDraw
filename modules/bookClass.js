const { chromium } = require('playwright');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const { v4: uuidv4 } = require('uuid');

const bookClass = async ({className, startTime}) => {
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
        // Navigate to a website with explicit timeout
        await page.goto(process.env.WEBSITE, {timeout: DEFAULT_TIMEOUT, waitUntil: 'networkidle'});

        if (!className) {
            throw new Error("Class name is required");
        }

        await page.getByRole('navigation').getByRole('link', { name: /members/i }).click({ 
            force: true,
            waitFor: 'networkidle',
            timeout: DEFAULT_TIMEOUT 
        });
        
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
            page.getByRole('link', { name: offsetBookingDate(2) }).click({ force: true })
        ]);

        // More robust class element detection with retry logic
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
                    throw new Error(`Could not find the class button after multiple attempts: ${e.message}`);
                }
                console.log(`Retrying class button detection (${retries} attempts left)`);
                await page.waitForTimeout(2000); // Wait 2 seconds before retrying
            }
        }
        
        const buttonValue = await button.evaluate(node => node.textContent);
        await button.click({force: true});
        await page.waitForTimeout(2000); // Wait a bit after clicking
        
        const response = { uid: await uuidv4(), bookingType: buttonValue };

        // Close the browser
        await browser.close();

        return response;
    } catch (error) {
        await browser.close();
        throw error;
    }
}

module.exports = bookClass;
