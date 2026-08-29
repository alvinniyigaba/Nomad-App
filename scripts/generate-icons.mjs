import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const SRC = fileURLToPath(new URL('../src/assets/group-crest.png', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const CREST_CREAM = { r: 0xef, g: 0xe2, b: 0xcf, alpha: 1 };

async function iconOnCream(size, fillFraction, outPath) {
  const inner = Math.round(size * fillFraction);
  const crest = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: CREST_CREAM } })
    .composite([{ input: crest, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, colors: 64 })
    .toFile(OUT_DIR + outPath);
}

await iconOnCream(192, 0.8, 'icon-192.png');
await iconOnCream(512, 0.8, 'icon-512.png');
// Maskable icons need extra padding so OS shape-masks don't clip the crest.
await iconOnCream(192, 0.6, 'icon-maskable-192.png');
await iconOnCream(512, 0.6, 'icon-maskable-512.png');
// iOS home screen icon — opaque, no transparency, iOS applies its own rounding.
await iconOnCream(180, 0.8, 'apple-touch-icon.png');
await iconOnCream(32, 0.85, 'favicon-32.png');
await iconOnCream(16, 0.85, 'favicon-16.png');

console.log('Icons written to public/icons/');
