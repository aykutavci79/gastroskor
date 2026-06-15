/**
 * Orijinal mobile/assets/logo.png → yuksek cozunurluk + "Tek Tikla Gastro" alt yazisi.
 * Vektor yeniden cizim yok; mevcut marka dosyasindan upscale.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../mobile/assets/logo.png');
const outDir = path.resolve(__dirname, 'panel-mockups');

const iconWidths = [1024, 2048, 4096];

function taglineSvg(canvasW, y) {
  const fontSize = Math.round(canvasW * 0.066);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${Math.round(fontSize * 2)}">
  <text x="50%" y="${y}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="${fontSize}" font-weight="600" fill="#A0A0A0">Tek T&#305;kla<tspan fill="#FF6B35" font-weight="800"> Gastro</tspan></text>
</svg>`);
}

for (const iconW of iconWidths) {
  const taglineH = Math.round(iconW * 0.14);
  const gap = Math.round(iconW * 0.04);
  const canvasH = iconW + gap + taglineH;

  const iconBuf = await sharp(src)
    .resize(iconW, iconW, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const tagBuf = await sharp(taglineSvg(iconW, Math.round(taglineH * 0.72)))
    .png()
    .toBuffer();

  const transparentName = `gastroskor-logo-tagline-${iconW}.png`;
  await sharp({
    create: { width: iconW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: iconBuf, top: 0, left: 0 },
      { input: tagBuf, top: iconW + gap, left: 0 },
    ])
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, transparentName));

  const darkName = `gastroskor-logo-tagline-dark-${iconW}.png`;
  await sharp({
    create: { width: iconW, height: canvasH, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 255 } },
  })
    .composite([
      { input: iconBuf, top: 0, left: 0 },
      { input: tagBuf, top: iconW + gap, left: 0 },
    ])
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, darkName));

  const iconOnlyName = `gastroskor-logo-icon-${iconW}.png`;
  await sharp(src)
    .resize(iconW, iconW, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 6 })
    .toFile(path.join(outDir, iconOnlyName));

  console.log('OK', transparentName, darkName, iconOnlyName);
}
