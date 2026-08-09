const { chromium } = require('playwright');
const path = require('path');

const targetUrl = process.env.BASE_URL || 'https://o-rock-sill.vercel.app/';

async function runTest(viewport, name) {
  console.log(`\n========================================`);
  console.log(`Running E2E test for [${name}] viewport: ${viewport.width}x${viewport.height}`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`========================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    console.error(`[${name} Page Error]:`, err.message);
    errors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[${name} Console Error]:`, msg.text());
      errors.push(msg.text());
    } else {
      console.log(`[${name} Console]:`, msg.text());
    }
  });

  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 1. Confirm storefront canvas renders
  console.log('Verifying storefront canvas renders...');
  const canvasVisible = await page.isVisible('#scene');
  if (!canvasVisible) {
    throw new Error('Storefront canvas (#scene) is not visible!');
  }

  const canvasBox = await page.$eval('#scene', (el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  console.log(`Canvas rendered size: ${canvasBox.width}x${canvasBox.height}`);
  if (canvasBox.width === 0 || canvasBox.height === 0) {
    throw new Error('Canvas has 0 width or height!');
  }

  // Take storefront screenshot
  // 2. Verify arcade interior appears immediately
  console.log('Waiting for arcade interior (#hud) to appear...');
  await page.waitForSelector('#hud', { state: 'visible', timeout: 5000 });
  console.log('Arcade interior is immediately visible!');

  // Take interior screenshot
  await page.screenshot({ path: path.join(__dirname, `screenshot_${name}_2_interior.png`) });
  console.log(`Interior screenshot saved.`);

  // 4. Click one cabinet
  console.log('Resolving cabinet coordinates...');
  const clickCoords = await page.evaluate((targetId) => {
    const m = window.__arcade.machines.find(x => x.game.id === targetId);
    if (!m) return null;
    
    const arcade = window.__arcade;
    const canvas = arcade.canvas;
    const rect = canvas.getBoundingClientRect();
    
    const wx = m.x;
    const wy = m.y - 10; // Click screen area of the cabinet
    
    const px = (wx - arcade.cam.x) * arcade.cam.scale + arcade.vw / 2;
    const py = (wy - arcade.cam.y) * arcade.cam.scale + arcade.vh / 2;
    
    const clientX = rect.left + (px / arcade.vw) * rect.width;
    const clientY = rect.top + (py / arcade.vh) * rect.height;
    
    return { x: clientX, y: clientY };
  }, 'last-bus-panic');

  if (!clickCoords) {
    throw new Error('Could not resolve client coordinates for target cabinet!');
  }

  console.log(`Clicking cabinet at screen coordinate: (${clickCoords.x}, ${clickCoords.y})`);

  let newTabPromise = context.waitForEvent('page');
  await page.mouse.click(clickCoords.x, clickCoords.y);

  // 5. Verify game actually launches
  console.log('Waiting for game page to open...');
  const newPage = await Promise.race([
    newTabPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_OPENING_GAME_TAB')), 10000))
  ]);

  console.log(`SUCCESS! Opened game URL: ${newPage.url()}`);
  
  await browser.close();

  if (errors.length > 0) {
    throw new Error(`Test for [${name}] failed with console/page errors: ${JSON.stringify(errors)}`);
  }
}

(async () => {
  try {
    // Run Desktop Viewport
    await runTest({ width: 1280, height: 720 }, 'Desktop');
    
    // Run Mobile Viewport
    await runTest({ width: 390, height: 844 }, 'Mobile');
    
    console.log('\nALL E2E TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\nE2E TEST RUN FAILED:', err.message);
    process.exit(1);
  }
})();
