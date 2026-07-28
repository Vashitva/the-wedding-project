/**
 * Generates the landing's two floral planes:
 *
 *   public/hero.png            the backdrop — a wall of white flowers, lit
 *                              from the upper right and falling into cool
 *                              shadow at the lower left
 *   public/hero-foreground.png blooms right up against the lens, wide open and
 *                              far out of focus, clustered at the edges with
 *                              the centre left clear for the type
 *
 * Rendering them separately is what makes the landing read as a shot rather
 * than a pattern: the two planes move at different rates as you scroll, so the
 * frame has real depth rather than a painted-on blur.
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
const OUT_FOREGROUND = path.join(process.cwd(), "public", "hero-foreground.png");

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
const PETAL_SHADE = [223, 212, 213];
// Light from the upper right, shadow falling cool into the lower left.
const KEY = [255, 250, 240];
const SHADOW = [156, 156, 176];
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

/* ── Foreground plane ────────────────────────────────────────────────── */

/**
 * Blooms pressed right up against the lens: huge, barely shaped, and pushed to
 * the edges so the middle of the frame stays clear for the names.
 */
function buildForeground() {
  const spots = [
    { x: 0.04, y: 0.12 }, { x: 0.14, y: -0.04 }, { x: -0.05, y: 0.42 },
    { x: 0.9, y: 0.08 }, { x: 1.02, y: 0.36 }, { x: 0.82, y: -0.06 },
    { x: 0.12, y: 0.95 }, { x: 0.36, y: 1.06 }, { x: 0.72, y: 1.02 },
    { x: 0.96, y: 0.86 }, { x: -0.02, y: 0.76 }, { x: 0.55, y: -0.08 },
  ];

  return spots.map(({ x, y }) => ({
    x,
    y,
    radius: 0.15 + random() * 0.13,
    petals: [5, 6, 6][Math.floor(random() * 3)],
    phase: random() * Math.PI * 2,
    // Wide open, but still recognisably a flower — past about 2.2 the petals
    // dissolve and the plane reads as fog rather than as blooms.
    softness: 1.5 + random() * 0.7,
    tint: 0,
    blush: random() < 0.7,
  }));
}

const foreground = buildForeground();
const foregroundColumns = bucketByColumn(foreground, 2.2);

/** Shared petal accumulation, so both planes are lit and shaped identically. */
function bloomCoverage(bloom, dx, dy, d) {
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
  return Math.max(
    cover,
    1 - smoothstep(bloom.radius * 0.24 - edge, bloom.radius * 0.24 + edge, d),
  );
}

/** Petal colour at a point, before it is composited. */
function petalColour(bloom, d, u, v) {
  const toCentre = 1 - clamp01(d / (bloom.radius * 1.02));
  let petal = mix(PETAL_LIGHT, PETAL_SHADE, smoothstep(0.15, 0.75, toCentre) * 0.55);
  if (bloom.blush) petal = mix(petal, BLUSH, 0.4);
  petal = mix(petal, HEART, smoothstep(0.78, 1, toCentre) * 0.7);

  // Key light from the upper right; the opposite corner falls cool.
  const lit = clamp01((u * 0.62 + (1 - v) * 0.38));
  petal = mix(petal, SHADOW, (1 - lit) * 0.54);
  petal = mix(petal, KEY, smoothstep(0.55, 1, lit) * 0.35);
  return petal;
}

/* ── Paint ───────────────────────────────────────────────────────────── */

const ASPECT = WIDTH / HEIGHT;

function paintBackdrop() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);

  for (let py = 0; py < HEIGHT; py++) {
    const v = py / HEIGHT;

    for (let px = 0; px < WIDTH; px++) {
      const u = px / WIDTH;

      let colour =
        v < 0.5
          ? mix(GROUND_TOP, GROUND_MID, smoothstep(0, 0.5, v))
          : mix(GROUND_MID, GROUND_LOW, smoothstep(0.5, 1, v));

      // The ground carries the same key light, so the planes agree.
      const lit = clamp01(u * 0.62 + (1 - v) * 0.38);
      colour = mix(colour, SHADOW, (1 - lit) * 0.58);
      colour = mix(colour, KEY, smoothstep(0.6, 1, lit) * 0.3);

      for (const leaf of leafColumns[px]) {
        const dx = (u - leaf.x) * ASPECT;
        const dy = v - leaf.y;
        const lx = dx * Math.cos(leaf.angle) + dy * Math.sin(leaf.angle);
        const ly = (-dx * Math.sin(leaf.angle) + dy * Math.cos(leaf.angle)) / leaf.squash;
        const cover = 1 - smoothstep(leaf.radius * 0.35, leaf.radius * 1.25, Math.hypot(lx, ly));
        if (cover > 0) colour = mix(colour, LEAF, cover * 0.5);
      }

      for (const bloom of bloomColumns[px]) {
        const dx = (u - bloom.x) * ASPECT;
        const dy = v - bloom.y;
        const d = Math.hypot(dx, dy);
        if (d > bloom.radius * 2) continue;

        const cover = bloomCoverage(bloom, dx, dy, d);
        if (cover <= 0) continue;

        const petal = petalColour(bloom, d, u, v);
        colour = mix(colour, mix(petal, colour, bloom.tint), cover);
      }

      /*
       * Lift the middle of the frame, where the names sit — the key light
       * falling on the part of the shot that matters, and what keeps the
       * backdrop from reading as one flat grey field.
       */
      const cx = (u - 0.5) * 2;
      const cy = (v - 0.45) * 2;
      const lift = 1 - clamp01((cx * cx + cy * cy) * 0.2);
      colour = mix(colour, [255, 252, 246], lift * 0.46);

      const noise = (random() - 0.5) * 1.1;
      const i = (py * WIDTH + px) * 3;
      pixels[i] = clamp01((colour[0] + noise) / 255) * 255;
      pixels[i + 1] = clamp01((colour[1] + noise) / 255) * 255;
      pixels[i + 2] = clamp01((colour[2] + noise) / 255) * 255;
    }
  }

  return encodePng(WIDTH, HEIGHT, pixels, { alpha: false });
}

function paintForeground() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let py = 0; py < HEIGHT; py++) {
    const v = py / HEIGHT;

    for (let px = 0; px < WIDTH; px++) {
      const u = px / WIDTH;

      let colour = [255, 255, 255];
      let alpha = 0;

      for (const bloom of foregroundColumns[px]) {
        const dx = (u - bloom.x) * ASPECT;
        const dy = v - bloom.y;
        const d = Math.hypot(dx, dy);
        if (d > bloom.radius * 2.2) continue;

        const cover = bloomCoverage(bloom, dx, dy, d);
        if (cover <= 0) continue;

        // Out of the key light and closest to the lens, so the near plane
        // reads a stop or so under the backdrop — which is what separates them.
        const petal = mix(petalColour(bloom, d, u, v), SHADOW, 0.3);
        // Nearer blooms paint over further ones rather than averaging.
        colour = mix(colour, petal, cover / Math.max(alpha + cover, 1e-6));
        alpha = Math.min(1, alpha + cover * (1 - alpha));
      }

      /*
       * Hold the middle of the frame clear. Without this the foreground drifts
       * across the couple's names as you scroll and the type stops reading.
       */
      const cx = (u - 0.5) * 2;
      const cy = (v - 0.47) * 2;
      const centre = 1 - smoothstep(0.28, 1.0, Math.hypot(cx * 0.8, cy));
      alpha *= 1 - centre;

      // Out-of-focus foreground is never fully opaque.
      alpha *= 0.62;

      const i = (py * WIDTH + px) * 4;
      pixels[i] = clamp01(colour[0] / 255) * 255;
      pixels[i + 1] = clamp01(colour[1] / 255) * 255;
      pixels[i + 2] = clamp01(colour[2] / 255) * 255;
      pixels[i + 3] = Math.round(clamp01(alpha) * 255);
    }
  }

  return encodePng(WIDTH, HEIGHT, pixels, { alpha: true });
}

const backdrop = paintBackdrop();
writeFileSync(OUT, backdrop);
console.log(
  `wrote public/hero.png (${WIDTH}×${HEIGHT}, ${(backdrop.length / 1024).toFixed(0)} KB)`,
);

const front = paintForeground();
writeFileSync(OUT_FOREGROUND, front);
console.log(
  `wrote public/hero-foreground.png (${WIDTH}×${HEIGHT}, ${(front.length / 1024).toFixed(0)} KB)`,
);
