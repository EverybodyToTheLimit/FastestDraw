const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE = path.join(__dirname, '../session_state.json');

const refreshSession = async () => {
    console.log("Starting Session Refresh...");
    const browser = await chromium.launch();
    let context;

    try {
        if (fs.existsSync(SESSION_FILE)) {
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
        await page.goto(process.env.WEBSITE + '/book-classes', { waitUntil: 'domcontentloaded' });

        if (await page.getByRole('button', { name: 'Sign in' }).isVisible()) {
            console.log("Session expired. Logging in...");
            await page.locator('#userSigninLogin').fill(process.env.USERNAME);
            await page.locator('#userSigninPassword').fill(process.env.PASSWORD);
            await page.getByRole('button', { name: 'Sign in' }).click();
            
            await page.waitForURL(/.*members.*/);
            
            await context.storageState({ path: SESSION_FILE });
            console.log("Session refreshed and saved.");
            return { status: "REFRESHED" };
        } else {
            console.log("Session is still valid. No action needed.");
            return { status: "VALID" };
        }

    } catch (error) {
        console.error("Refresh failed:", error.message);
        throw error;
    } finally {
        await browser.close();
    }
};

module.exports = refreshSession;