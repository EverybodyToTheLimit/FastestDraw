const { chromium } = require('playwright');
const playwright = require('playwright');
const offsetBookingDate = require('../helpers/offsetBookingDate');
const { v4: uuidv4 } = require('uuid');
const { expect } = require('@playwright/test');

const bookClass = async ({className, startTime}) => {
    // Launch a headless Chromium browser
    const browser = await chromium.launch();

    // Create a new browser context
    const context = await browser.newContext();

    // Open a new page within the context
    const page = await context.newPage();

    try {
        // Navigate to a website
        await page.goto(process.env.WEBSITE);

        if (!className) {
            throw new Error("Class name is required");
        }

        await page.getByRole('navigation').getByRole('link', { name: /members/i }).click({ force: true });
        await page.locator('#userSigninLogin').fill(process.env.USERNAME);
        await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click({ force: true });
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('link', { name: 'Book classes' }).click({ force: true });
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('link', { name: offsetBookingDate(6) }).click({ force: true });
        await page.waitForLoadState('domcontentloaded')

        try {
            await page
            .locator('.class')
            .filter({ hasText: className })
            .filter({ hasText: startTime })
            .getByRole('button')
            .waitFor({ timeout: 1000 });
            await page.screenshot({path: 'screenshot.png', fullpage:true})
            await page.waitForLoadState('domcontentloaded')
          } catch (e) {
            if (e instanceof playwright.errors.TimeoutError) {
                throw new Error(JSON.stringify(e));
            }
          }

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
        await browser.close();
        throw error;
    }
}

module.exports = bookClass;
