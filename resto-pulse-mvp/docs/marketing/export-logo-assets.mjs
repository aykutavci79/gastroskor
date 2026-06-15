/**
 * GastroSkor logo / laptop screen PNG export (4K + 1080p + icon)
 * Usage: python -m http.server 8766 (in docs/marketing) then node export-logo-assets.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'panel-mockups');

const exports = [
  { id: 'screen-1080', file: 'gastroskor-laptop-screen-1080.png', viewport: { width: 1920, height: 1080 } },
  { id: 'screen-1080-tight', file: 'gastroskor-laptop-screen-1080-tight.png', viewport: { width: 1920, height: 1080 } },
  { id: 'screen-1080-minimal', file: 'gastroskor-laptop-screen-1080-minimal.png', viewport: { width: 1920, height: 1080 } },
  { id: 'screen-4k', file: 'gastroskor-laptop-screen-4k.png', viewport: { width: 3840, height: 2160 } },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const item of exports) {
  await page.setViewportSize(item.viewport);
  await page.goto('http://127.0.0.1:8766/gastroskor-laptop-screen.html', { waitUntil: 'networkidle' });
  const el = page.locator(`#${item.id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const opts = { path: path.join(outDir, item.file) };
  await el.screenshot(opts);
  console.log('OK', item.file);
}

await browser.close();
