/**
 * Generates the PWA icon set — two interlocking gold rings on sindoor red.
 *
 * Geometry rather than an image library — see scripts/lib/png.mjs.
 *
 *   node scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodePng } from "./lib/png.mjs";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const FIELD = [124, 26, 40];
const RING = [238, 205, 138];

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
        rgba[i + c] = Math.round(FIELD[c] + (RING[c] - FIELD[c]) * coverage);
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
