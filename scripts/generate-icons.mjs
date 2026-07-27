/**
 * Generates the PWA icon set — two interlocking rings on an olive field.
 *
 * Written as a tiny PNG encoder rather than pulling in an image library:
 * the icons are simple geometry, and this keeps the dependency list honest.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const OLIVE = [95, 107, 79];
const GOLD = [222, 201, 148];

/* ── PNG encoding ────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes RGBA pixel data (8-bit, no interlace) as a PNG buffer. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type; 0 (None) keeps this simple.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Drawing ─────────────────────────────────────────────────────────── */

/**
 * Coverage of a ring (annulus) at a point, anti-aliased over one pixel width.
 * Returns 0…1.
 */
function ringCoverage(x, y, cx, cy, radius, thickness) {
  const d = Math.hypot(x - cx, y - cy);
  const half = thickness / 2;
  const edge = Math.abs(d - radius);
  // Smooth the last pixel of the band rather than hard-clipping it.
  return Math.max(0, Math.min(1, half + 0.5 - edge));
}

function drawIcon(size, { padding }) {
  const rgba = Buffer.alloc(size * size * 4);

  const inner = size * (1 - padding * 2);
  const radius = inner * 0.21;
  const thickness = Math.max(2, inner * 0.055);
  const cy = size / 2 + inner * 0.02;
  const offset = radius * 0.78;
  const cx1 = size / 2 - offset;
  const cx2 = size / 2 + offset;

  const SS = 3; // 3×3 supersampling

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coverage = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const a = ringCoverage(px, py, cx1, cy, radius, thickness);
          const b = ringCoverage(px, py, cx2, cy, radius, thickness);
          coverage += Math.max(a, b);
        }
      }

      coverage = Math.min(1, coverage / (SS * SS));

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(OLIVE[c] + (GOLD[c] - OLIVE[c]) * coverage);
      }
      rgba[i + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

/* ── Output ──────────────────────────────────────────────────────────── */

const targets = [
  { file: "icon-32.png", size: 32, padding: 0.12 },
  { file: "icon-192.png", size: 192, padding: 0.12 },
  { file: "icon-512.png", size: 512, padding: 0.12 },
  // Maskable icons get extra breathing room for the platform's safe zone.
  { file: "icon-maskable-512.png", size: 512, padding: 0.22 },
  { file: "apple-touch-icon.png", size: 180, padding: 0.12 },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, size, padding } of targets) {
  writeFileSync(path.join(OUT_DIR, file), drawIcon(size, { padding }));
  console.log(`wrote public/icons/${file} (${size}×${size})`);
}
