/**
 * A small physics engine for the event pages.
 *
 * One integrator, four force profiles. Nothing here is decorative easing —
 * particles carry velocity and are pushed around by gravity, drag, a wind
 * field and curl-ish turbulence, which is what makes petals fall like petals
 * rather than like falling divs.
 *
 * The engine is renderer-agnostic: it steps the simulation and hands the
 * particle list back. Drawing happens in the canvas component.
 */

export type Kind = "petal" | "powder" | "mote" | "ring";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radius in CSS pixels. */
  size: number;
  /** Rotation of the sprite in the picture plane. */
  angle: number;
  spin: number;
  /**
   * Phase of the flutter oscillation. A falling petal turns edge-on and back,
   * which both narrows it and swings it sideways — this drives both.
   */
  flutter: number;
  flutterRate: number;
  /** How strongly this particle flutters, 0…1. */
  flutterAmount: number;
  life: number;
  maxLife: number;
  hue: number;
  alpha: number;
  kind: Kind;
};

export type Profile = {
  kind: Kind;
  /** Particles alive at once, at a reference width of 1200px. */
  count: number;
  gravity: number;
  /** Air resistance, per second. Higher means it reaches terminal velocity sooner. */
  drag: number;
  /** Horizontal drift, in px/s. */
  wind: number;
  /** Strength of the swirling turbulence field. */
  turbulence: number;
  sizeRange: [number, number];
  flutterRange: [number, number];
  spinRange: [number, number];
  /** Seconds. */
  lifeRange: [number, number];
  /** Where new particles enter: the top edge, or anywhere in frame. */
  emitFrom: "top" | "field";
  colours: string[];
  alphaRange: [number, number];
};

/* ── Force profiles ──────────────────────────────────────────────────── */

export const PROFILES: Record<string, Profile> = {
  /**
   * Ring ceremony — gold light rather than matter. Motes hang almost weightless
   * and drift upward on the warm air, so the frame feels lit rather than windy.
   */
  rings: {
    kind: "mote",
    count: 70,
    gravity: -22,
    drag: 0.8,
    wind: 8,
    turbulence: 10,
    sizeRange: [1.2, 4.5],
    flutterRange: [0.3, 0.9],
    spinRange: [-0.2, 0.2],
    lifeRange: [6, 13],
    emitFrom: "field",
    colours: ["#d8b878", "#e8cf9c", "#c19a5a", "#f2e3c4"],
    alphaRange: [0.25, 0.75],
  },

  /**
   * Sangeet — the room, not the weather. Orbs rise on a beat: heavier
   * turbulence and a fast flutter give the drifting a pulse to it.
   */
  sangeet: {
    kind: "mote",
    count: 90,
    gravity: -34,
    drag: 1,
    wind: -12,
    turbulence: 26,
    sizeRange: [1.5, 6],
    flutterRange: [1.4, 3.2],
    spinRange: [-0.6, 0.6],
    lifeRange: [5, 10],
    emitFrom: "field",
    colours: ["#a888c0", "#c9a6d8", "#e6c9ee", "#8f6ba6", "#f0dff5"],
    alphaRange: [0.3, 0.8],
  },

  /**
   * Haldi — turmeric thrown into the air. Real weight, real drag, and enough
   * turbulence that the cloud breaks up on the way down instead of falling as
   * a sheet.
   */
  haldi: {
    kind: "powder",
    count: 220,
    gravity: 220,
    drag: 1.6,
    wind: 26,
    turbulence: 46,
    sizeRange: [0.8, 3.2],
    flutterRange: [0.5, 1.6],
    spinRange: [-1, 1],
    lifeRange: [4, 7.5],
    emitFrom: "top",
    colours: ["#e0a92a", "#f0c552", "#c98f1c", "#f7dd93", "#b87d12"],
    alphaRange: [0.28, 0.85],
  },

  /**
   * Shadi — a shower of petals. Low gravity against high drag gives a slow
   * terminal velocity, and a strong flutter makes each one swing as it turns
   * edge-on. That swing is the whole reason it reads as a petal.
   */
  petals: {
    kind: "petal",
    count: 55,
    gravity: 90,
    drag: 1.2,
    wind: 16,
    turbulence: 14,
    sizeRange: [5, 13],
    flutterRange: [0.8, 2.1],
    spinRange: [-0.9, 0.9],
    lifeRange: [9, 16],
    emitFrom: "top",
    colours: ["#e7aab4", "#f3ccd2", "#d98d9c", "#fbe4e7", "#c9788a"],
    alphaRange: [0.45, 0.95],
  },
};

/* ── Simulation ──────────────────────────────────────────────────────── */

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

function spawn(profile: Profile, width: number, height: number, initial: boolean): Particle {
  const maxLife = rand(...profile.lifeRange);

  // On first fill, scatter through the frame; afterwards enter from the edge,
  // otherwise particles visibly pop into existence mid-air.
  const fromTop = profile.emitFrom === "top" && !initial;

  return {
    x: rand(-0.05, 1.05) * width,
    y: fromTop ? rand(-0.25, -0.02) * height : rand(-0.05, 1.05) * height,
    vx: rand(-12, 12),
    vy: profile.gravity > 0 ? rand(0, 26) : rand(-18, 4),
    size: rand(...profile.sizeRange),
    angle: rand(0, Math.PI * 2),
    spin: rand(...profile.spinRange),
    flutter: rand(0, Math.PI * 2),
    flutterRate: rand(...profile.flutterRange),
    flutterAmount: rand(0.45, 1),
    // Start partway through life so the opening frame isn't a synchronised fade.
    life: initial ? rand(0, maxLife) : 0,
    maxLife,
    hue: 0,
    alpha: rand(...profile.alphaRange),
    kind: profile.kind,
  };
}

/**
 * A cheap stand-in for curl noise: two offset sine fields crossed so the flow
 * swirls instead of pushing everything the same way.
 */
function turbulence(x: number, y: number, t: number): [number, number] {
  const fx = Math.sin(y * 0.011 + t * 0.6) * Math.cos(x * 0.007 - t * 0.35);
  const fy = Math.cos(x * 0.009 - t * 0.5) * Math.sin(y * 0.013 + t * 0.28);
  return [fx, fy];
}

export function createSystem(profile: Profile, width: number, height: number) {
  // Scale the population with the canvas so a phone isn't drawing a desktop's worth.
  const target = Math.round(profile.count * Math.min(1.35, Math.max(0.4, width / 1200)));
  let particles = Array.from({ length: target }, () =>
    spawn(profile, width, height, true),
  );

  return {
    get particles() {
      return particles;
    },

    resize(nextWidth: number, nextHeight: number) {
      width = nextWidth;
      height = nextHeight;
      const next = Math.round(
        profile.count * Math.min(1.35, Math.max(0.4, width / 1200)),
      );
      if (next > particles.length) {
        particles = particles.concat(
          Array.from({ length: next - particles.length }, () =>
            spawn(profile, width, height, true),
          ),
        );
      } else {
        particles = particles.slice(0, next);
      }
    },

    /** @param dt seconds since the last step, already clamped by the caller. */
    step(dt: number, time: number) {
      for (const p of particles) {
        const [tx, ty] = turbulence(p.x, p.y, time);

        // Flutter: the sprite turns edge-on and back, and the same phase pushes
        // it sideways — a petal swings because it is presenting its face to the
        // air on alternate half-cycles.
        p.flutter += p.flutterRate * dt;
        const swing = Math.sin(p.flutter) * p.flutterAmount;

        const ax =
          profile.wind + tx * profile.turbulence + swing * profile.turbulence * 1.4;
        const ay = profile.gravity + ty * profile.turbulence * 0.5;

        p.vx += (ax - p.vx * profile.drag) * dt;
        p.vy += (ay - p.vy * profile.drag) * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        p.life += dt;

        const escaped =
          p.life > p.maxLife ||
          p.y > height * 1.12 ||
          p.y < -height * 0.35 ||
          p.x < -width * 0.15 ||
          p.x > width * 1.15;

        if (escaped) Object.assign(p, spawn(profile, width, height, false));
      }
    },
  };
}

export type System = ReturnType<typeof createSystem>;

/** 0…1 envelope so particles fade in and out rather than blinking. */
export function envelope(p: Particle): number {
  const t = p.life / p.maxLife;
  return Math.min(1, Math.min(t / 0.14, (1 - t) / 0.24));
}

export function particleColour(profile: Profile, index: number): string {
  return profile.colours[index % profile.colours.length];
}

export { pick, rand };
