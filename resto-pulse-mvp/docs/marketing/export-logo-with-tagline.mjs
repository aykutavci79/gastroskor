/**
 * GastroSkor logo + "Tek Tıkla Gastro" tagline → yüksek çözünürlük PNG
 * Usage: npm install sharp && node export-logo-with-tagline.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, 'panel-mockups');

const sources = [
  {
    src: path.join(__dirname, 'gastroskor-logo-with-tagline.svg'),
    prefix: 'gastroskor-logo-tagline',
  },
  {
    src: path.join(__dirname, 'gastroskor-logo-with-tagline-dark.svg'),
    prefix: 'gastroskor-logo-tagline-dark',
  },
];

const widths = [1024, 2048, 4096];

for (const { src, prefix } of sources) {
  for (const width of widths) {
    const name = `${prefix}-${width}.png`;
    await sharp(src)
      .resize(width, null, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(outDir, name));
    console.log('OK', name);
  }
}
