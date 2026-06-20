/**
 * Panel sunum mockup HTML → PNG export (Playwright)
 *
 * Usage:
 *   cd resto-pulse-mvp/docs/marketing
 *   python -m http.server 8765
 *   node export-panel-mockups.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'panel-mockups.html');
const outDir = path.join(__dirname, 'panel-mockups');
const htmlUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

const screens = [
  { id: 'dashboard', file: 'dashboard.png' },
  { id: 'vitrin-menu', file: 'vitrin-menu.png' },
  { id: 'online-siparis', file: 'online-siparis.png' },
  { id: 'remedy', file: 'remedy.png' },
  { id: 'ozel-sikayetler', file: 'ozel-sikayetler.png' },
  { id: 'takipciler-kupon', file: 'takipciler-kupon.png' },
  { id: 'rakip-analizi', file: 'rakip-analizi.png' },
  { id: 'google-isletme', file: 'google-isletme.png' },
  { id: 'bildirimler', file: 'bildirimler.png' },
  { id: 'menu-kalemleri', file: 'menu-kalemleri.png' },
  { id: 'vitrin-iletisim', file: 'vitrin-iletisim.png' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 920 } });
await page.goto(htmlUrl, { waitUntil: 'load' });

for (const { id, file } of screens) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await el.screenshot({ path: path.join(outDir, file) });
  console.log('Wrote', file);
}

await browser.close();
