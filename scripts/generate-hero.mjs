/**
 * Generates the default landing backdrop: dusk over a meadow, with marigold
 * garlands strung across the top and diyas burning along the ridge.
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

// Sized for the grade it sits under: heavily scrimmed and grained, so this is
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

/** Hermite ease between two edges. */
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

const SKY_TOP = [22, 11, 18];
const SKY_MID = [58, 24, 28];
const SKY_HORIZON = [116, 55, 30];
const GLOW = [232, 146, 60];
const HILL_FAR = [30, 15, 14];
const HILL_NEAR = [14, 7, 7];

// Genda phool: saffron at the edge of each bloom, turmeric at the centre.
const MARIGOLD_DEEP = [196, 78, 16];
const MARIGOLD = [232, 126, 26];
const MARIGOLD_CORE = [248, 190, 70];
const LEAF = [46, 58, 32];
const FLAME = [255, 178, 92];

const HORIZON = 0.7; // as a fraction of height

/* ── Terrain ─────────────────────────────────────────────────────────── */

/** Layered sines — a rolling ridge line without needing real noise. */
function ridge(u, { amp, freq, phase, base }) {
  const a =
    Math.sin(u * freq + phase) * 0.55 +
    Math.sin(u * freq * 2.3 + phase * 1.7) * 0.3 +
    Math.sin(u * freq * 4.7 + phase * 0.6) * 0.15;
  return base + a * amp;
}

/* ── Marigold garlands ───────────────────────────────────────────────── */

/*
 * Kept in the top fifth of the frame. On a phone the image is cropped hard to
 * a tall aspect, which flattens these curves towards horizontal — any lower and
 * the garlands saw straight through the couple's names.
 */
const STRINGS = [
  { y: 0.014, sag: 0.11, size: 0.72, tilt: 0.018 },
  { y: 0.042, sag: 0.122, size: 0.95, tilt: -0.03 },
  { y: 0.006, sag: 0.163, size: 1.22, tilt: 0.042 },
];

/** Height of a garland's thread at horizontal position t (0…1). */
function threadY(string, t) {
  // Catenary approximated by a parabola between the two anchor points.
  return string.y + string.sag * 4 * t * (1 - t) + string.tilt * t;
}

/** Blooms packed tightly enough along each thread to read as one garland. */
function buildBlooms() {
  const blooms = [];

  for (const string of STRINGS) {
    const radius = 0.0105 * string.size;
    const spacing = radius * 0.95;
    const count = Math.round(1 / spacing);

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      blooms.push({
        x: t * 1.08 - 0.04,
        // Blooms sit just under the thread they are tied to.
        y: threadY(string, t) + radius * 0.5 + (random() - 0.5) * radius * 0.9,
        // Hand-strung: no two the same size.
        radius: radius * (0.7 + random() * 0.62),
        // Some catch the light, some sit in shadow.
        tone: random(),
      });
    }
  }

  return blooms;
}

const blooms = buildBlooms();

/* ── Diyas ───────────────────────────────────────────────────────────── */

/** Oil lamps set along the near ridge, receding towards the horizon. */
function buildDiyas() {
  const diyas = [];

  for (let i = 0; i < 17; i++) {
    const t = (i + 0.5) / 17 + (random() - 0.5) * 0.03;
    diyas.push({
      x: t,
      // Scattered across the slope rather than lined up on one contour.
      y: HORIZON + 0.05 + random() * 0.055,
      radius: 0.0035 + random() * 0.0035,
      intensity: 0.6 + random() * 0.4,
    });
  }

  return diyas;
}

const diyas = buildDiyas();

/*
 * Both garlands and diyas are looked up per pixel, and there are far too many
 * to test them all every time. Bucketing them by pixel column turns the inner
 * loop from ~250 candidates into a handful.
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

const bloomColumns = bucketByColumn(blooms, 1.6);
const diyaColumns = bucketByColumn(diyas, 7);

/** Coverage of the threads, so the blooms read as strung, not scattered. */
function threadCoverage(u, v) {
  let coverage = 0;

  for (const string of STRINGS) {
    const t = (u + 0.04) / 1.08;
    if (t < -0.02 || t > 1.02) continue;
    const d = Math.abs(v - threadY(string, t));
    coverage = Math.max(coverage, 1 - smoothstep(0, 0.0018, d));
  }

  return coverage;
}

/* ── Paint ───────────────────────────────────────────────────────────── */

const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);

for (let py = 0; py < HEIGHT; py++) {
  const v = py / HEIGHT;

  for (let px = 0; px < WIDTH; px++) {
    const u = px / WIDTH;

    // Sky: night at the top easing down into a warm band at the horizon.
    let colour;
    if (v < 0.45) {
      colour = mix(SKY_TOP, SKY_MID, smoothstep(0, 0.45, v));
    } else {
      colour = mix(SKY_MID, SKY_HORIZON, smoothstep(0.45, HORIZON, v));
    }

    // Afterglow sitting just below the ridge, slightly off-centre.
    const gx = (u - 0.54) / 0.42;
    const gy = (v - (HORIZON + 0.02)) / 0.3;
    const glow = Math.exp(-(gx * gx + gy * gy) * 1.6);
    colour = mix(colour, GLOW, clamp01(glow * 0.62));

    // The threads first, so the blooms sit on top of them.
    const thread = threadCoverage(u, v);
    if (thread > 0) {
      colour = mix(colour, LEAF, thread * 0.8);
    }

    /*
     * Marigold blooms. Each is a solid flower rather than a glow: saffron at
     * the rim, turmeric at the centre, with a soft edge so it stays out of
     * focus at this scale.
     */
    for (const flower of bloomColumns[px]) {
      const dx = (u - flower.x) * (WIDTH / HEIGHT);
      const dy = v - flower.y;
      const d = Math.hypot(dx, dy);
      if (d > flower.radius * 1.6) continue;

      const cover = 1 - smoothstep(flower.radius * 0.45, flower.radius * 1.1, d);
      if (cover <= 0) continue;

      // Radially graded petals, darkest at the rim.
      const toCentre = 1 - clamp01(d / (flower.radius * 1.05));
      let petal = mix(MARIGOLD_DEEP, MARIGOLD, smoothstep(0, 0.55, toCentre));
      petal = mix(petal, MARIGOLD_CORE, smoothstep(0.62, 1, toCentre) * 0.85);
      // Lift the ones catching the last of the light.
      petal = mix(petal, MARIGOLD_CORE, flower.tone * 0.16);

      colour = mix(colour, petal, cover);
    }

    /*
     * Ridges. Both edges are feathered over a pixel rather than thresholded —
     * a hard edge here stair-steps badly once the browser scales the image up
     * to fill a phone screen.
     */
    const edge = 0.8 / HEIGHT;

    const farLine = ridge(u, { amp: 0.034, freq: 6.4, phase: 1.3, base: HORIZON });
    const farCoverage = smoothstep(farLine - edge, farLine + edge, v);
    if (farCoverage > 0) {
      const depth = smoothstep(farLine, farLine + 0.06, v);
      colour = mix(colour, HILL_FAR, (0.82 + depth * 0.18) * farCoverage);
    }

    // Near ridge, darker and higher-contrast against the glow.
    const nearLine = ridge(u, { amp: 0.052, freq: 3.3, phase: 4.1, base: HORIZON + 0.13 });
    const nearCoverage = smoothstep(nearLine - edge, nearLine + edge, v);
    if (nearCoverage > 0) {
      colour = mix(colour, HILL_NEAR, 0.94 * nearCoverage);
    }

    /*
     * Diyas along the slope. Drawn after the ridges so the lamps sit on the
     * hillside rather than behind it.
     */
    for (const diya of diyaColumns[px]) {
      const dx = (u - diya.x) * (WIDTH / HEIGHT);
      const dy = v - diya.y;
      const d2 = dx * dx + dy * dy;
      const r = diya.radius;
      if (d2 > r * r * 49) continue;

      const halo = Math.exp(-d2 / (r * r * 4)) * diya.intensity;
      const flame = Math.exp(-d2 / (r * r * 0.35)) * diya.intensity;
      colour = mix(colour, FLAME, clamp01(halo * 0.34 + flame * 0.8));
    }

    // Corner falloff — the CSS vignette layers on top of this.
    const cx = (u - 0.5) * 2;
    const cy = (v - 0.5) * 2;
    const vignette = 1 - clamp01((cx * cx + cy * cy) * 0.24);
    colour = [colour[0] * vignette, colour[1] * vignette, colour[2] * vignette];

    /*
     * Dither. Wide smooth gradients band badly at 8 bits per channel, and the
     * banding is very visible on a dark hero; a little noise breaks it up.
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
