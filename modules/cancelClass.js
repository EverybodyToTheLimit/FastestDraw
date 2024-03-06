const { chromium } = require('playwright');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const dotenv = require('dotenv');
const cancelClass = async ({booking}) => {

    // Launch a headless Chromium browser
    const browser = await chromium.launch();

    // Create a new browser context
    const context = await browser.newContext();

    // Open a new page within the context
    const page = await context.newPage();

    try {
        const {className, startTime} = booking
        // Navigate to a website
        await page.goto(process.env.WEBSITE);

        if (!className) {
            throw new Error("Class name is required");
        }
        else if (!startTime) {
            throw new Error("Start time is required");
        }

        await page.getByRole('navigation').getByRole('link', { name: /members/i }).click({ force: true });
        await page.locator('#userSigninLogin').fill(process.env.USERNAME);
        await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click({ force: true });
        await page.getByRole('link', { name: 'Book classes' }).click({ force: true });
        await page.getByRole('link', { name: offsetBookingDate(0) }).click({ force: true });
        const button = await page
            .locator('.class')
            .filter({ hasText: className })
            .filter({ hasText: startTime })
            .getByRole('button');
        const buttonValue = await button.evaluate(node => node.textContent);
        if (buttonValue !== 'Cancel Waitinglist' && buttonValue !== 'Cancel Booking') {throw new Error("The button is neither Cancel Waitinglist nor Cancel Booking")}
        page.on('dialog', dialog => dialog.accept());
        await button
           .click({force: true});
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
