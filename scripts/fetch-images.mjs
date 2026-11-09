// Downloads Aman Self Drive's own photos and logo from amanselfdrivecars.com and writes optimised copies to public/images.
//
// Why: hot-linking failed for every .avif photo, because the client's server sends them as `text/plain` with
// `X-Content-Type-Options: nosniff` and browsers refuse to render them. Self-hosting also lets us serve sized WebP files.
// Nothing is redrawn or recoloured: photos are only resized/re-encoded, and logos are copied byte for byte.
//
// Usage:  npm run images        (needs network; re-run whenever the client updates photos)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { VEHICLES } from '../src/data/vehicles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'images');
const BASE = 'https://amanselfdrivecars.com/assets/images/';

async function download(file) {
  const res = await fetch(BASE + encodeURI(file), { headers: { 'User-Agent': 'aman-site-build' } });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function variants(buf, outBase, widths, quality = 78) {
  const meta = await sharp(buf).metadata();
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(`${outBase}-${w}.webp`);
  }
  return { width: meta.width, height: meta.height };
}

const report = [];
await mkdir(join(OUT, 'fleet'), { recursive: true });
await mkdir(join(OUT, 'places'), { recursive: true });
await mkdir(join(OUT, 'brand'), { recursive: true });

// Fleet photos: 480 px for cards, 960 px for the details modal / retina cards.
for (const v of VEHICLES) {
  const buf = await download(v.sourceImage);
  const dim = await variants(buf, join(OUT, 'fleet', v.id), [480, 960]);
  report.push(`fleet/${v.id}  ${dim.width}x${dim.height}  <- ${v.sourceImage}`);
}

// City photos used by the Locations section and the hero backdrop.
for (const city of ['vijayawada', 'hyderabad', 'vizag']) {
  const buf = await download(`self_drive_cars_in_${city}.jpg`);
  const dim = await variants(buf, join(OUT, 'places', city), [640, 1200], 72);
  report.push(`places/${city}  ${dim.width}x${dim.height}`);
}

// Hero vehicle: the client's own branded Thar 4x4 photograph.
{
  const buf = await download('Thar 4x4.jpeg');
  const dim = await variants(buf, join(OUT, 'fleet', 'hero-thar'), [560, 800, 1400], 80);
  report.push(`fleet/hero-thar  ${dim.width}x${dim.height}`);
}

// Official logos, copied unmodified.
for (const [src, dest] of [['Aman_Logo.png', 'aman-logo.png'], ['widget-icon.png', 'aman-icon.png']]) {
  const buf = await download(src);
  await writeFile(join(OUT, 'brand', dest), buf);
  const m = await sharp(buf).metadata();
  report.push(`brand/${dest}  ${m.width}x${m.height} (unmodified copy)`);
}

console.log(report.join('\n'));
console.log(`\n${report.length} assets written to public/images`);
