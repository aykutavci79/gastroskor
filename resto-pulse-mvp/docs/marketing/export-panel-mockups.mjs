/**
 * Panel mockup HTML → PNG export (Playwright)
 * Usage: node docs/marketing/export-panel-mockups.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'panel-mockups.html');
const outDir = path.join(__dirname, 'panel-mockups');

const screens = [
  { id: 'dashboard', file: '01-panel-dashboard.png' },
  { id: 'orders', file: '02-panel-siparis-onay.png' },
  { id: 'menu', file: '03-panel-menu.png' },
  { id: 'promo', file: '04-panel-online-siparis.png' },
  { id: 'mobile', file: '05-mobil-musteri.png' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:8765/panel-mockups.html', { waitUntil: 'networkidle' });

for (const { id, file } of screens) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: path.join(outDir, file) });
  console.log('Wrote', file);
}

await browser.close();
