/**
 * Generates the default landing backdrop: dusk over a meadow, with festoon
 * lights strung through the foreground.
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

const SKY_TOP = [10, 14, 16];
const SKY_MID = [22, 31, 30];
const SKY_HORIZON = [74, 62, 42];
const GLOW = [214, 158, 86];
const HILL_FAR = [17, 23, 20];
const HILL_NEAR = [8, 11, 10];
const LIGHT = [255, 226, 170];

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

/* ── Festoon lights ──────────────────────────────────────────────────── */

/**
 * Bulbs hung along catenary strings across the upper frame. Each is a soft
 * radial bloom rather than a hard disc — they are meant to sit out of focus.
 */
/*
 * Kept in the top fifth of the frame. On a phone the image is cropped hard to
 * a tall aspect, which flattens these curves towards horizontal — any lower and
 * the wires saw straight through the couple's names.
 */
const STRINGS = [
  { y: 0.018, sag: 0.115, count: 14, size: 0.7, tilt: 0.018 },
  { y: 0.052, sag: 0.15, count: 12, size: 0.95, tilt: -0.03 },
  { y: 0.012, sag: 0.205, count: 10, size: 1.25, tilt: 0.042 },
];

/** Height of a string's wire at horizontal position t (0…1). */
function wireY(string, t) {
  // Catenary approximated by a parabola between the two anchor points.
  return string.y + string.sag * 4 * t * (1 - t) + string.tilt * t;
}

function buildLights() {
  const lights = [];

  for (const string of STRINGS) {
    for (let i = 0; i < string.count; i++) {
      // Uneven spacing — hand-hung lights are never on a perfect pitch.
      const t = (i + 0.5) / string.count + (random() - 0.5) * 0.02;
      lights.push({
        x: t * 1.08 - 0.04,
        // Bulbs hang a little below the wire they're clipped to.
        y: wireY(string, t) + 0.012 * string.size,
        radius: (0.011 + random() * 0.008) * string.size,
        intensity: 0.55 + random() * 0.45,
      });
    }
  }

  return lights;
}

const lights = buildLights();

/** Coverage of the wires at a point, so the bulbs read as strung, not scattered. */
function wireCoverage(u, v) {
  let coverage = 0;

  for (const string of STRINGS) {
    const t = (u + 0.04) / 1.08;
    if (t < -0.02 || t > 1.02) continue;
    const d = Math.abs(v - wireY(string, t));
    // ~1.5px of soft line at this canvas height.
    coverage = Math.max(coverage, 1 - smoothstep(0, 0.0022, d));
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

    // The wires first, so the bulbs sit on top of them.
    const wire = wireCoverage(u, v);
    if (wire > 0) {
      colour = mix(colour, [58, 50, 40], wire * 0.75);
    }

    // Festoon bulbs and their bloom.
    for (const light of lights) {
      const dx = (u - light.x) * (WIDTH / HEIGHT);
      const dy = v - light.y;
      const d2 = dx * dx + dy * dy;
      const r = light.radius;
      if (d2 < r * r * 36) {
        const bloom = Math.exp(-d2 / (r * r * 0.5)) * light.intensity;
        const core = Math.exp(-d2 / (r * r * 0.06)) * light.intensity;
        colour = mix(colour, LIGHT, clamp01(bloom * 0.5 + core * 0.85));
      }
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
