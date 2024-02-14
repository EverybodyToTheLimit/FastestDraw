const { chromium } = require('playwright');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const { v4: uuidv4 } = require('uuid');

const bookClass = async ({className, startTime}) => {

    // Launch a headless Chromium browser
    const browser = await chromium.launch();

    // Create a new browser context
    const context = await browser.newContext();

    // Open a new page within the context
    const page = await context.newPage();

    try {
        // Navigate to a website
        await page.goto('https://www.workoutbristol.co.uk/');

        if (!className) {
            throw new Error("Class name is required");
        }

        await page.getByRole('navigation').getByRole('link', { name: /members/i }).click({ force: true });
        await page.locator('#userSigninLogin').fill('bartoszzawlocki+workout@gmail.com');
        await page.locator('#userSigninPassword').fill('vg&sQGHqi@kQW%x*L$BYYFNXHV5HHi');
        await page.getByRole('button', { name: 'Sign in' }).click({ force: true });
        await page.getByRole('link', { name: 'Book classes' }).click({ force: true });
        await page.getByRole('link', { name: offsetBookingDate(6) }).click({ force: true });
        const button = await page
            .locator('.class')
            .filter({ hasText: className })
            .filter({ hasText: startTime })
            .getByRole('button');
        const buttonValue = await button.evaluate(node => node.textContent);
        await button
           .click({force: true});
        const response = { uid: await uuidv4(), bookingType: buttonValue };

        // Close the browser
        await browser.close();

        return response;
    } catch (error) {
        // Close the browser in case of an error
        await browser.close();
        throw error;
    }
}

module.exports = bookClass;