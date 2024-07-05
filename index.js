const puppeteer = require("puppeteer");
require("dotenv").config();

(async () => {
  try {
    const code = process.env.CODE;
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    const option = { waitUntil: "networkidle2" };
    const browser = await puppeteer.launch({ headless: false });
    const context = browser.defaultBrowserContext();
    const page = await browser.newPage();

    // Set geolocation permissions before navigating to the page
    await context.overridePermissions(
      "https://g0918c3ea1d7838-payrolldb1.adb.ap-singapore-1.oraclecloudapps.com",
      ["geolocation"]
    );

    // Optionally set a specific geolocation
    await page.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });

    console.log("Navigating to URL...");
    await page.goto(
      "https://g0918c3ea1d7838-payrolldb1.adb.ap-singapore-1.oraclecloudapps.com/ords/r/wps/a105/login_desktop?session=202965588686978",
      option
    );

    const typeIntoField = async (selector, text) => {
      await page.waitForSelector(selector);
      const field = await page.$(selector);
      if (field) {
        await field.focus();
        await field.type(text, { delay: 100 });
      } else {
        throw new Error(`Field not found: ${selector}`);
      }
    };

    const clickAndWaitForNavigation = async (selector, delay = 0) => {
      await page.waitForSelector(selector);
      const button = await page.$(selector);
      if (button) {
        // button viewport allow location on every visit
        await page.evaluate((btn) => {
          btn.scrollIntoView();
        }, button);

        const isVisible = await page.evaluate((btn) => {
          const rect = btn.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
              (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
              (window.innerWidth || document.documentElement.clientWidth) &&
            window.getComputedStyle(btn).visibility !== "hidden" &&
            window.getComputedStyle(btn).display !== "none"
          );
        }, button);

        if (!isVisible) {
          throw new Error(
            `Button with selector ${selector} is not visible or interactable`
          );
        }

        //add delay if specified
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        await Promise.all([
          button.click(), // Click the button with a slight delay
          page
            .waitForNavigation(option)
            .catch((e) => console.log("Navigation error:", e)),
        ]);
      } else {
        throw new Error(`Button with selector ${selector} not found`);
      }
    };

    // Auto input code company
    console.log("Typing code into the input field...");
    await typeIntoField("input[name=P9999_REKAN_CODE]", code);

    // Click the submit button
    console.log("Clicking the submit button...");
    await clickAndWaitForNavigation("#SUBMIT");

    // Wait for username and password fields to appear after navigation
    console.log("Waiting for username field to appear...");
    await typeIntoField("input[name=P9999_USERNAME]", username);

    console.log("Waiting for password field to appear...");
    await typeIntoField("input[name=P9999_PASSWORD]", password);

    // Auto click login button
    console.log("Clicking the login button...");
    await clickAndWaitForNavigation("#B14445971363655733278");

    //loop sampai button muncul
    let isButtonVisible = false;

    while (!isButtonVisible) {
      // Auto click checkin button
      console.log("Clicking the checkin button...");
      await clickAndWaitForNavigation("#B4936907692560278659", 1000);

      //add delay before click check-location button
      console.log("Clicking the check-location button...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.waitForSelector("#B5611000118048138027");
      await page.click("#B5611000118048138027");
    }

    //check button checkin-checkout visible
    try {
      await page.waitForSelector("#B5610999341798138019", { setTimeout: 5000 });
      isButtonVisible = true;
      console.log("Button checkin-checkout visible");
    } catch (error) {
      console.log("Button checkin-checkout not visible");
    }

    //check for the last login
    const lastLoginSelector = "div[role='region']";
    const lastLoginElement = await page.$(lastLoginSelector);

    if (lastLoginElement) {
      const lastLoginInfo = await page.evaluate(
        (el) => el.innerText,
        lastLoginElement
      );
      console.log(
        "Logged in successfully.Last login info found:\n",
        lastLoginInfo
      );
    } else {
      console.log("Login failed. Last login info not found.");
    }

    console.log("Closing browser...");
    // await browser.close();
    console.log("Script completed successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
})();
