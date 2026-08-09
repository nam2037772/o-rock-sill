const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', (err) => {
    console.error('Page Error:', err);
  });
  page.on('console', (msg) => {
    console.log('Page Console:', msg.text());
  });

  // Track new pages
  let newTabPromise = context.waitForEvent('page');

  console.log('Navigating to O-ROCK-SILL production URL (#sky-raid)...');
  await page.goto('https://o-rock-sill.vercel.app/#sky-raid');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const { width, height } = page.viewportSize();
  console.log(`Clicking center of screen (${width/2}, ${height/2})...`);
  
  // Actually click the exact coordinate using Playwright!
  // Since we used #sky-hook, the camera is centered on it.
  await page.mouse.click(width / 2, height / 2);
  
  console.log('Waiting for new tab to open...');
  const newPage = await newTabPromise;
  console.log('SUCCESS! New tab opened directly. URL:', newPage.url());

  await browser.close();
})();
