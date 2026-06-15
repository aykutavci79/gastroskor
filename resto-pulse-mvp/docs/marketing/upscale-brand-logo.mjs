/** Orijinal marka PNG → yüksek çözünürlük */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../frontend/public/logo.png');
const out = path.resolve(__dirname, 'panel-mockups');

const sizes = [
  { name: 'gastroskor-logo-icon-512.png', w: 512 },
  { name: 'gastroskor-logo-icon-1024.png', w: 1024 },
  { name: 'gastroskor-logo-icon-2048.png', w: 2048 },
  { name: 'gastroskor-logo-icon-4096.png', w: 4096 },
];

for (const { name, w } of sizes) {
  await sharp(src)
    .resize(w, w, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 6 })
    .toFile(path.join(out, name));
  console.log('OK', name);
}
