const {chromium} = require('../.vercel/qa/node_modules/playwright');
const fs = require('fs');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const context = await browser.newContext({colorScheme: 'dark'});
    await context.route('https://stillwell.test/**', route => {
      const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      return route.fulfill({
        body: name === 'config.js' ? 'window.STILLWELL_CONFIG={}' : fs.readFileSync('dist/' + name),
        contentType: ({js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', png: 'image/png'})[name.split('.').pop()] || 'application/octet-stream'
      });
    });
    const page = await context.newPage();
    const theme = (value, target = page) => target.waitForFunction(value => document.documentElement.dataset.theme === value, value);
    await page.goto('https://stillwell.test');
    await page.waitForSelector('.sidebar');
    await theme('dark');
    await page.locator('input[value="light"]').check({force: true});
    await page.reload();
    await theme('light');
    const second = await context.newPage();
    await second.goto('https://stillwell.test');
    await theme('light', second);
    await page.locator('input[value="dark"]').check({force: true});
    await theme('dark', second);
    await page.emulateMedia({colorScheme: 'light'});
    await theme('dark');
    await page.locator('input[value="system"]').check({force: true});
    await theme('light');
    await page.emulateMedia({colorScheme: 'dark'});
    await theme('dark');
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 960});
      for (const name of ['home','mood','assessment','chat','resources','appointments','profile','privacy','help','counselor','admin']) {
        await page.evaluate(name => { state.page = name; state.role = 'admin'; render(); }, name);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow at ${width}`);
      }
    }
    await page.evaluate(() => localStorage.setItem('stillwell-appearance', 'invalid'));
    await page.reload();
    await theme('dark');
    await context.close();
    const blocked = await browser.newContext({colorScheme: 'dark'});
    await blocked.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {get() {throw new Error('Storage unavailable');}});
    });
    const blockedPage = await blocked.newPage();
    await blockedPage.goto('about:blank');
    await blockedPage.addScriptTag({path: 'dist/theme.js'});
    await theme('dark', blockedPage);
    console.log('PASS appearance persistence, cross-tab sync, system changes, invalid/blocked storage, 11 desktop/mobile pages');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
