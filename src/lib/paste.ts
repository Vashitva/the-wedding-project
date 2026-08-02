/**
 * A brush that paints like turmeric paste rather than like ink.
 *
 * A canvas stroke is a solid ribbon of colour with clean edges, which is the
 * one thing haldi paste is not. Ground turmeric, sandalwood and rosewater is
 * granular, uneven, thicker where the hand pressed and broken where it lifted,
 * and it piles up into a darker rim along the sides of a smear. So nothing here
 * uses `ctx.stroke()`. Instead a textured stamp is pressed down repeatedly
 * along a path, the way a finger actually lays paste.
 *
 * Two passes per stamp — a wider, deeper rim underneath and a brighter core on
 * top — because that ridge of pushed-aside paste is most of what makes a smear
 * read as something with body rather than a coloured line.
 *
 * Stamps are pre-rendered once per colour and blitted, for the same reason the
 * event pages cache their glow sprites: building a noisy sprite per stamp per
 * frame is all garbage.
 */

export type Rgb = [number, number, number];

/** One pressing of the brush. Position is in device-independent pixels. */
export type Stamp = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  rotation: number;
  /** Which pre-rendered variant to use, so repeats don't tile visibly. */
  variant: number;
  colour: Rgb;
};

/** Deterministic, so the composition is identical for every guest. */
export function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VARIANTS = 4;
const SPRITE_RADIUS = 44;

const cache = new Map<string, HTMLCanvasElement>();

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Builds one stamp: a soft disc whose alpha is chewed up by noise, plus a
 * scatter of harder grains. The grains matter more than the disc — they are
 * what stops a smear looking airbrushed.
 */
function buildSprite(colour: Rgb, variant: number): HTMLCanvasElement {
  const key = `${colour.join(",")}|${variant}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = SPRITE_RADIUS * 2;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const data = image.data;

  const random = mulberry32(0x5a1d + variant * 977);
  // A coarse value-noise field, sampled per pixel with bilinear blending. Fine
  // enough to read as grain, coarse enough not to look like television static.
  const GRID = 9;
  const field = Array.from({ length: (GRID + 1) * (GRID + 1) }, () => random());
  const sample = (u: number, v: number) => {
    const x = u * GRID;
    const y = v * GRID;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const at = (i: number, j: number) =>
      field[Math.min(GRID, j) * (GRID + 1) + Math.min(GRID, i)];
    const a = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const b = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
    return a * (1 - fy) + b * fy;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - SPRITE_RADIUS) / SPRITE_RADIUS;
      const dy = (y - SPRITE_RADIUS) / SPRITE_RADIUS;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;

      // Body: full in the middle, falling away well before the edge so the
      // rim is ragged rather than a circle.
      const body = smoothstep(1, 0.28, d);
      const grain = sample((x / size) * 0.999, (y / size) * 0.999);

      let alpha = body * (0.45 + 0.75 * grain);
      // Hard grains: a few percent of pixels sit proud of the rest, which is
      // what unground turmeric actually looks like.
      if (grain > 0.82) alpha = Math.min(1, alpha * 1.5);
      // And gaps, where the paste simply did not take.
      if (grain < 0.2) alpha *= 0.25;

      const i = (y * size + x) * 4;
      data[i] = colour[0];
      data[i + 1] = colour[1];
      data[i + 2] = colour[2];
      data[i + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  cache.set(key, sprite);
  return sprite;
}

export function drawStamp(ctx: CanvasRenderingContext2D, stamp: Stamp) {
  const sprite = buildSprite(stamp.colour, stamp.variant % VARIANTS);
  ctx.save();
  ctx.globalAlpha = stamp.alpha;
  ctx.translate(stamp.x, stamp.y);
  ctx.rotate(stamp.rotation);
  ctx.drawImage(sprite, -stamp.r, -stamp.r, stamp.r * 2, stamp.r * 2);
  ctx.restore();
}

/* ── Paths ───────────────────────────────────────────────────────────── */

export type Point = { x: number; y: number };

/**
 * Catmull-Rom through the control points, so a smear curves the way an arm
 * does rather than bending at each control point.
 */
export function sampleCurve(points: Point[], steps: number): Point[] {
  if (points.length < 2) return points.slice();
  const padded = [points[0], ...points, points[points.length - 1]];
  const out: Point[] = [];

  for (let i = 0; i < padded.length - 3; i++) {
    const [p0, p1, p2, p3] = padded.slice(i, i + 4);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export type SmearSpec = {
  /** Control points in normalised 0…1 space, so the shape survives any aspect. */
  points: Point[];
  /** Peak brush radius, as a fraction of the smaller canvas dimension. */
  width: number;
  core: Rgb;
  rim: Rgb;
  seed: number;
};

/**
 * Turns a smear into the ordered list of stamps that draw it.
 *
 * The width profile is the tell: paste goes on thin as the hand lands, swells
 * where it presses, and breaks up as it lifts. A stroke of constant width
 * reads as a painted stripe no matter how good the texture is.
 */
export function buildSmear(
  spec: SmearSpec,
  width: number,
  height: number,
): Stamp[] {
  const random = mulberry32(spec.seed);
  const unit = Math.min(width, height);
  const peak = spec.width * unit;

  const path = sampleCurve(
    spec.points.map((p) => ({ x: p.x * width, y: p.y * height })),
    18,
  );

  const stamps: Stamp[] = [];
  const spacing = Math.max(1.4, peak * 0.16);

  let carried = 0;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    if (segment === 0) continue;

    let travelled = carried;
    while (travelled < segment) {
      const t = travelled / segment;
      const along = (i - 1 + t) / (path.length - 1);

      // Thin, swelling, then breaking: a lifted hand, not a printed line.
      const envelope =
        smoothstep(0, 0.16, along) * (1 - smoothstep(0.55, 1, along) * 0.85);
      const r = peak * (0.35 + 0.65 * envelope) * (0.85 + random() * 0.3);

      const x = from.x + (to.x - from.x) * t + (random() - 0.5) * r * 0.3;
      const y = from.y + (to.y - from.y) * t + (random() - 0.5) * r * 0.3;

      // Coverage falls away at the tail, so the smear runs out rather than
      // stopping.
      const coverage = 0.5 + 0.5 * envelope;

      // Rim first, wider and deeper — the ridge paste is pushed into.
      stamps.push({
        x,
        y,
        r: r * 1.18,
        alpha: 0.22 * coverage,
        rotation: random() * Math.PI * 2,
        variant: Math.floor(random() * VARIANTS),
        colour: spec.rim,
      });
      stamps.push({
        x,
        y,
        r,
        alpha: (0.5 + random() * 0.35) * coverage,
        rotation: random() * Math.PI * 2,
        variant: Math.floor(random() * VARIANTS),
        colour: spec.core,
      });

      // The odd fleck flung clear of the stroke.
      if (random() < 0.06) {
        const angle = random() * Math.PI * 2;
        const throwOut = r * (1.3 + random() * 1.6);
        stamps.push({
          x: x + Math.cos(angle) * throwOut,
          y: y + Math.sin(angle) * throwOut,
          r: r * (0.08 + random() * 0.14),
          alpha: 0.35 + random() * 0.4,
          rotation: random() * Math.PI * 2,
          variant: Math.floor(random() * VARIANTS),
          colour: spec.core,
        });
      }

      travelled += spacing;
    }
    carried = travelled - segment;
  }

  return stamps;
}

/**
 * A handprint: palm plus five fingers, each laid down with the same brush.
 *
 * Pressed rather than drawn — every stamp of a print lands at once, because a
 * hand does. Haldi handprints get left on doorframes and walls for luck, which
 * is why this belongs on the page at all.
 */
export function buildHandprint(
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  core: Rgb,
  rim: Rgb,
  seed: number,
): Stamp[] {
  const random = mulberry32(seed);
  const stamps: Stamp[] = [];

  const place = (lx: number, ly: number, r: number, alpha: number) => {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const x = cx + (lx * c - ly * s);
    const y = cy + (lx * s + ly * c);
    stamps.push({
      x,
      y,
      r: r * 1.15,
      alpha: alpha * 0.35,
      rotation: random() * Math.PI * 2,
      variant: Math.floor(random() * VARIANTS),
      colour: rim,
    });
    stamps.push({
      x,
      y,
      r,
      alpha,
      rotation: random() * Math.PI * 2,
      variant: Math.floor(random() * VARIANTS),
      colour: core,
    });
  };

  /*
   * `size` is the whole hand, fingertip to wrist. Everything below is a
   * fraction of that, and the proportions are the point: fingers rise from the
   * *top edge* of the palm, not from its centre, and each is far narrower than
   * the palm's own stamps. Get either wrong and the print collapses into a
   * blob with whiskers.
   */

  // Palm: a filled ellipse of small stamps, so the outline stays irregular.
  const palmY = size * 0.24;
  const palmRx = size * 0.29;
  const palmRy = size * 0.25;
  for (let i = 0; i < 54; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random());
    place(
      Math.cos(a) * d * palmRx,
      Math.sin(a) * d * palmRy + palmY,
      size * (0.070 + random() * 0.035),
      0.5 + random() * 0.32,
    );
  }
  // The heel of the hand takes the weight, so it prints darker.
  for (let i = 0; i < 14; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random());
    place(
      Math.cos(a) * d * palmRx * 0.62,
      Math.sin(a) * d * palmRy * 0.45 + palmY + size * 0.12,
      size * (0.065 + random() * 0.03),
      0.6 + random() * 0.3,
    );
  }

  /* Four fingers, rising from the knuckle line at the top of the palm. */
  const fingers = [
    { x: -0.185, length: 0.30, splay: -0.30, r: 0.052 }, // little
    { x: -0.065, length: 0.39, splay: -0.10, r: 0.056 }, // ring
    { x: 0.062, length: 0.42, splay: 0.06, r: 0.056 }, // middle
    { x: 0.180, length: 0.35, splay: 0.24, r: 0.050 }, // index
  ];

  const knuckle = palmY - palmRy * 0.82;
  for (const finger of fingers) {
    const steps = 11;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const reach = size * finger.length * t;
      // Fingertips press hardest; the middle of a finger barely touches at all.
      const press = 0.35 + 0.65 * t * t;
      place(
        finger.x * size + Math.sin(finger.splay) * reach + (random() - 0.5) * size * 0.012,
        knuckle - Math.cos(finger.splay) * reach + (random() - 0.5) * size * 0.012,
        size * finger.r * (1 - 0.25 * t),
        (0.34 + random() * 0.26) * press,
      );
    }
  }

  /* Thumb: off the side of the palm, shorter and angled well out. */
  const thumbSteps = 9;
  for (let i = 0; i < thumbSteps; i++) {
    const t = i / (thumbSteps - 1);
    const reach = size * 0.30 * t;
    const angle = -2.25;
    place(
      -palmRx * 0.85 + Math.cos(angle) * reach * -1,
      palmY - size * 0.02 + Math.sin(angle) * reach,
      size * (0.062 - 0.014 * t),
      (0.34 + random() * 0.24) * (0.4 + 0.6 * t * t),
    );
  }

  return stamps;
}
