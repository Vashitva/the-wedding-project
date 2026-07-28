/**
 * Generates the PWA icon set — a six-petal bloom on a dusty rose field.
 *
 * Geometry rather than an image library — see scripts/lib/png.mjs.
 *
 *   node scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodePng } from "./lib/png.mjs";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const FIELD = [176, 112, 124];
const PETAL = [255, 253, 252];
const HEART = [232, 205, 160];

/* ── Drawing ─────────────────────────────────────────────────────────── */

/** Coverage of a filled disc at a point, anti-aliased over one pixel. */
function discCoverage(x, y, cx, cy, radius) {
  const d = Math.hypot(x - cx, y - cy);
  return Math.max(0, Math.min(1, radius + 0.5 - d));
}

/**
 * A ring of overlapping round petals about a heart — the same construction as
 * the flowers in the hero backdrop, so the icon and the landing agree.
 */
function drawIcon(size, { padding }) {
  const rgba = Buffer.alloc(size * size * 4);

  const inner = size * (1 - padding * 2);
  const centre = size / 2;
  const petals = 6;
  const petalOffset = inner * 0.2;
  const petalRadius = inner * 0.168;
  const heartRadius = inner * 0.088;

  const SS = 3; // 3×3 supersampling

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let petalCover = 0;
      let heartCover = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const sxp = x + (sx + 0.5) / SS;
          const syp = y + (sy + 0.5) / SS;

          let best = 0;
          for (let k = 0; k < petals; k++) {
            // Rotated a half-step so the bloom sits square in the tile.
            const a = (Math.PI * 2 * k) / petals - Math.PI / 2;
            best = Math.max(
              best,
              discCoverage(
                sxp,
                syp,
                centre + Math.cos(a) * petalOffset,
                centre + Math.sin(a) * petalOffset,
                petalRadius,
              ),
            );
          }
          petalCover += best;
          heartCover += discCoverage(sxp, syp, centre, centre, heartRadius);
        }
      }

      petalCover = Math.min(1, petalCover / (SS * SS));
      heartCover = Math.min(1, heartCover / (SS * SS));

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        // Field, then petals, then the heart on top.
        let value = FIELD[c] + (PETAL[c] - FIELD[c]) * petalCover;
        value = value + (HEART[c] - value) * heartCover;
        rgba[i + c] = Math.round(value);
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
