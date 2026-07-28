/**
 * Generates the default landing backdrop: a wall of white flowers, thrown out
 * of focus.
 *
 * It is painted, not photographed — deliberately soft and abstract, so it reads
 * as atmosphere rather than as a picture of somewhere that isn't your venue.
 * Replace public/hero.png with a real photograph whenever you have one; nothing
 * else needs to change.
 *
 *   node scripts/generate-hero.mjs
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { encodePng } from "./lib/png.mjs";

// Sized for the veil it sits under: heavily lightened and grained, so this is
// plenty even on a large display, and it keeps the first paint light.
const WIDTH = 1600;
const HEIGHT = 900;
const OUT = path.join(process.cwd(), "public", "hero.png");

/* ── Helpers ─────────────────────────────────────────────────────────── */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Deterministic PRNG, so the same image comes out on every machine. */
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20270515);

/* ── Palette ─────────────────────────────────────────────────────────── */

const GROUND_TOP = [253, 250, 249];
const GROUND_MID = [248, 242, 239];
const GROUND_LOW = [243, 235, 231];

const PETAL_LIGHT = [255, 255, 254];
const PETAL_SHADE = [235, 223, 222];
const HEART = [240, 214, 176];
const BLUSH = [246, 227, 228];
const LEAF = [205, 216, 199];

/* ── Blooms ──────────────────────────────────────────────────────────── */

/**
 * Each flower is a ring of overlapping round petals around a small heart —
 * rather than a polar rose, whose sharp minima read as a star rather than a
 * bloom. Blooms nearer the "camera" are larger and softer-edged, which is what
 * sells the depth.
 */
function buildBlooms() {
  const blooms = [];

  // Three planes, back to front.
  const planes = [
    { count: 64, min: 0.03, max: 0.055, softness: 0.5, tint: 0.5 },
    { count: 34, min: 0.06, max: 0.095, softness: 0.8, tint: 0.24 },
    { count: 14, min: 0.105, max: 0.16, softness: 1.3, tint: 0.08 },
  ];

  for (const plane of planes) {
    for (let i = 0; i < plane.count; i++) {
      blooms.push({
        x: random() * 1.16 - 0.08,
        y: random() * 1.2 - 0.1,
        radius: lerp(plane.min, plane.max, random()),
        petals: [5, 5, 6, 6, 8][Math.floor(random() * 5)],
        phase: random() * Math.PI * 2,
        softness: plane.softness,
        // Back planes sit further into the ground colour.
        tint: plane.tint,
        blush: random() < 0.45,
      });
    }
  }

  return blooms;
}

const blooms = buildBlooms();

/** Leaves: simple soft ellipses, tucked behind everything else. */
function buildLeaves() {
  return Array.from({ length: 34 }, () => ({
    x: random() * 1.16 - 0.08,
    y: random() * 1.2 - 0.1,
    radius: 0.03 + random() * 0.06,
    angle: random() * Math.PI,
    squash: 0.28 + random() * 0.18,
  }));
}

const leaves = buildLeaves();

/**
 * Both sets are looked up per pixel, and there are far too many to test them
 * all every time. Bucketing them by pixel column turns the inner loop from
 * ~120 candidates into a handful.
 */
function bucketByColumn(items, reachMultiplier) {
  const columns = Array.from({ length: WIDTH }, () => []);

  for (const item of items) {
    const reach = item.radius * reachMultiplier;
    const from = Math.max(0, Math.floor((item.x - reach) * WIDTH));
    const to = Math.min(WIDTH - 1, Math.ceil((item.x + reach) * WIDTH));
    for (let column = from; column <= to; column++) columns[column].push(item);
  }

  return columns;
}

const leafColumns = bucketByColumn(leaves, 2.2);
const bloomColumns = bucketByColumn(blooms, 2.2);

/* ── Paint ───────────────────────────────────────────────────────────── */

const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
const ASPECT = WIDTH / HEIGHT;

for (let py = 0; py < HEIGHT; py++) {
  const v = py / HEIGHT;

  for (let px = 0; px < WIDTH; px++) {
    const u = px / WIDTH;

    // Ground: near-white, warming very slightly towards the bottom.
    let colour =
      v < 0.5
        ? mix(GROUND_TOP, GROUND_MID, smoothstep(0, 0.5, v))
        : mix(GROUND_MID, GROUND_LOW, smoothstep(0.5, 1, v));

    for (const leaf of leafColumns[px]) {
      const dx = (u - leaf.x) * ASPECT;
      const dy = v - leaf.y;
      // Rotate into the leaf's own frame, then squash one axis.
      const lx = dx * Math.cos(leaf.angle) + dy * Math.sin(leaf.angle);
      const ly = (-dx * Math.sin(leaf.angle) + dy * Math.cos(leaf.angle)) / leaf.squash;
      const d = Math.hypot(lx, ly);
      const cover = 1 - smoothstep(leaf.radius * 0.35, leaf.radius * 1.25, d);
      if (cover > 0) colour = mix(colour, LEAF, cover * 0.5);
    }

    for (const bloom of bloomColumns[px]) {
      const dx = (u - bloom.x) * ASPECT;
      const dy = v - bloom.y;
      const d = Math.hypot(dx, dy);
      if (d > bloom.radius * 2) continue;

      const edge = bloom.radius * 0.2 * bloom.softness;
      const petalOffset = bloom.radius * 0.56;
      const petalRadius = bloom.radius * 0.47;

      let cover = 0;
      for (let k = 0; k < bloom.petals; k++) {
        const a = bloom.phase + (Math.PI * 2 * k) / bloom.petals;
        const pd = Math.hypot(
          dx - Math.cos(a) * petalOffset,
          dy - Math.sin(a) * petalOffset,
        );
        cover = Math.max(cover, 1 - smoothstep(petalRadius - edge, petalRadius + edge, pd));
      }
      // The heart, filling the gap the petals leave in the middle.
      cover = Math.max(
        cover,
        1 - smoothstep(bloom.radius * 0.24 - edge, bloom.radius * 0.24 + edge, d),
      );
      if (cover <= 0) continue;

      // Petals are lightest at the rim and warm towards the heart.
      const toCentre = 1 - clamp01(d / (bloom.radius * 1.02));
      let petal = mix(PETAL_LIGHT, PETAL_SHADE, smoothstep(0.15, 0.75, toCentre) * 0.55);
      if (bloom.blush) petal = mix(petal, BLUSH, 0.4);
      petal = mix(petal, HEART, smoothstep(0.78, 1, toCentre) * 0.7);

      // Distant blooms sit back into the ground rather than reading as cutouts.
      colour = mix(colour, mix(petal, colour, bloom.tint), cover);
    }

    // A soft lift towards the centre, where the type sits.
    const cx = (u - 0.5) * 2;
    const cy = (v - 0.45) * 2;
    const lift = 1 - clamp01((cx * cx + cy * cy) * 0.22);
    colour = mix(colour, [255, 254, 253], lift * 0.32);

    /*
     * Dither. Wide near-white gradients band badly at 8 bits per channel, and
     * on a pale hero the banding is very visible; a little noise breaks it up.
     */
    const noise = (random() - 0.5) * 1.1;

    const i = (py * WIDTH + px) * 3;
    pixels[i] = clamp01((colour[0] + noise) / 255) * 255;
    pixels[i + 1] = clamp01((colour[1] + noise) / 255) * 255;
    pixels[i + 2] = clamp01((colour[2] + noise) / 255) * 255;
  }
}

const png = encodePng(WIDTH, HEIGHT, pixels, { alpha: false });
writeFileSync(OUT, png);

console.log(
  `wrote public/hero.png (${WIDTH}×${HEIGHT}, ${(png.length / 1024).toFixed(0)} KB)`,
);
