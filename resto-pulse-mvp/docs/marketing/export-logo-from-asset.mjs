/**
 * Orijinal mobile/assets/logo.png → tek SVG render (seam yok) + kompakt kompozisyon.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../mobile/assets/logo.png');
const outDir = path.resolve(__dirname, 'panel-mockups');

const iconWidths = [1024, 2048, 4096];
const DARK_HEX = '#141414';

async function cropToContent() {
  const bounds = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minY = bounds.info.height;
  let maxY = 0;
  let minX = bounds.info.width;
  let maxX = 0;

  for (let y = 0; y < bounds.info.height; y++) {
    for (let x = 0; x < bounds.info.width; x++) {
      const i = (y * bounds.info.width + x) * 4;
      const r = bounds.data[i];
      const g = bounds.data[i + 1];
      const b = bounds.data[i + 2];
      const a = bounds.data[i + 3];
      if (a > 10 && (r > 25 || g > 25 || b > 25)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }

  const pad = 6;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(bounds.info.width - left, maxX - minX + 1 + pad * 2);
  const height = Math.min(bounds.info.height - top, maxY - minY + 1 + pad * 2);

  const cropped = await sharp(src)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cropped;

  // Kaynak PNG'de pin ortasında yatay seam var (~y241-246); export'ta interpolate et.
  const seamY0 = 241 - top;
  const seamY1 = 246 - top;
  const sampleAbove = Math.max(0, seamY0 - 6);
  const sampleBelow = Math.min(info.height - 1, seamY1 + 6);
  for (let x = 0; x < info.width; x++) {
    const ia = (sampleAbove * info.width + x) * 4;
    const ib = (sampleBelow * info.width + x) * 4;
    for (let y = seamY0; y <= seamY1; y++) {
      if (y < 0 || y >= info.height) continue;
      const t = (y - seamY0) / Math.max(1, seamY1 - seamY0);
      const i = (y * info.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(data[ia + c] * (1 - t) + data[ib + c] * t);
      }
      data[i + 3] = Math.max(data[ia + 3], data[ib + 3]);
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

let croppedSrc;

async function buildMasterSvg(iconW, { dark }) {
  if (!croppedSrc) croppedSrc = await cropToContent();
  const croppedMeta = await sharp(croppedSrc).metadata();

  const iconDisplayW = Math.round(iconW * 0.5);
  const iconDisplayH = Math.round(
    iconDisplayW * (croppedMeta.height / croppedMeta.width),
  );
  const iconX = Math.round((iconW - iconDisplayW) / 2);

  const iconPng = await sharp(croppedSrc)
    .resize(iconDisplayW, iconDisplayH, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const iconB64 = iconPng.toString('base64');

  const wordSize = Math.round(iconW * 0.084);
  const tagSize = Math.round(iconW * 0.046);
  const gap = Math.round(iconW * 0.01);
  const wordY = iconDisplayH + gap + Math.round(wordSize * 0.82);
  const tagY = wordY + Math.round(tagSize * 1.38);
  const canvasH = tagY + Math.round(tagSize * 0.55);
  const bgRect = dark
    ? `<rect width="${iconW}" height="${canvasH}" fill="${DARK_HEX}"/>`
    : '';

  return {
    svg: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${iconW}" height="${canvasH}" viewBox="0 0 ${iconW} ${canvasH}">
  ${bgRect}
  <image href="data:image/png;base64,${iconB64}" x="${iconX}" y="0" width="${iconDisplayW}" height="${iconDisplayH}"/>
  <text x="50%" y="${wordY}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="${wordSize}" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Gastro<tspan fill="#FF6B35">Skor</tspan></text>
  <text x="50%" y="${tagY}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="${tagSize}" font-weight="600" xml:space="preserve">
    <tspan fill="#A0A0A0">Tek T&#305;kla </tspan><tspan fill="#FF6B35" font-weight="800">Gastro</tspan>
  </text>
</svg>`),
    canvasH,
  };
}

for (const iconW of iconWidths) {
  const dark = await buildMasterSvg(iconW, { dark: true });
  await sharp(dark.svg)
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, `gastroskor-logo-tagline-dark-${iconW}.png`));

  const light = await buildMasterSvg(iconW, { dark: false });
  await sharp(light.svg)
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, `gastroskor-logo-tagline-${iconW}.png`));

  await sharp(src)
    .resize(iconW, iconW, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, `gastroskor-logo-icon-${iconW}.png`));

  console.log('OK', iconW, dark.canvasH);
}
