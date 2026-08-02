"use client";

import { useEffect, useRef } from "react";
import {
  buildHandprint,
  buildSmear,
  drawStamp,
  type Rgb,
  type Stamp,
} from "@/lib/paste";

/**
 * Turmeric going on, one handful at a time.
 *
 * The ambient layer already has powder in the air; this is the other half of a
 * haldi — paste actually being applied. Smears arrive in sequence and are
 * *drawn*, not revealed: the brush advances along each path so you watch it go
 * on, the way you watch an aunt do it. Then two handprints press down, which is
 * the thing that gets left on doorframes for luck.
 *
 * Paste stays. So the canvas is append-only: completed strokes are never
 * redrawn, each frame only stamps whatever the last few milliseconds newly
 * uncovered, and once the last handprint lands the animation loop stops
 * altogether. A page that has finished its animation should cost nothing.
 */

/* Turmeric proper — a saturated golden yellow that leans orange, not lemon. */
const CORE: Rgb = [232, 168, 38];
const RIM: Rgb = [176, 116, 22];
/* Sandalwood in the paste knocks some strokes browner. */
const CORE_WARM: Rgb = [216, 140, 40];
const RIM_WARM: Rgb = [150, 92, 20];

/**
 * The composition, in normalised space — y is a fraction of the *free* band,
 * not of the canvas. The headline, date and description own the bottom of the
 * hero, and paste over type is just illegible type.
 *
 * How much room that leaves depends entirely on shape. A wide desktop frame
 * gives the type the bottom third; a tall phone frame gives it more than half,
 * because the same words wrap onto four lines instead of two. So the whole
 * composition is squeezed into whatever is actually free, rather than being
 * laid out once for a laptop and allowed to land on the title everywhere else.
 */
const SMEARS = [
  {
    at: 0.25,
    duration: 0.75,
    spec: {
      points: [
        { x: 0.06, y: 0.30 },
        { x: 0.26, y: 0.20 },
        { x: 0.47, y: 0.27 },
        { x: 0.63, y: 0.20 },
      ],
      width: 0.055,
      core: CORE,
      rim: RIM,
      seed: 11,
    },
  },
  {
    at: 1.05,
    duration: 0.65,
    spec: {
      points: [
        { x: 0.94, y: 0.16 },
        { x: 0.78, y: 0.31 },
        { x: 0.62, y: 0.40 },
      ],
      width: 0.045,
      core: CORE_WARM,
      rim: RIM_WARM,
      seed: 27,
    },
  },
  {
    at: 1.75,
    duration: 0.5,
    spec: {
      points: [
        { x: 0.20, y: 0.50 },
        { x: 0.34, y: 0.45 },
        { x: 0.44, y: 0.50 },
      ],
      width: 0.032,
      core: CORE,
      rim: RIM,
      seed: 43,
    },
  },
];

const PRINTS = [
  { at: 2.35, cx: 0.80, cy: 0.47, size: 0.30, rotation: 0.30, core: CORE, rim: RIM, seed: 61 },
  { at: 2.95, cx: 0.12, cy: 0.45, size: 0.25, rotation: -0.42, core: CORE_WARM, rim: RIM_WARM, seed: 79 },
];

/** When the last thing lands, plus a beat. */
const FINISHED = 3.5;

type Track = { stamps: Stamp[]; from: number; to: number; drawn: number };

export default function HaldiSmear({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let tracks: Track[] = [];
    let elapsed = 0;
    let frame = 0;
    let running = false;
    let complete = false;

    /**
     * Measures the element and rebuilds the composition for the new size.
     *
     * Same lesson as the rings: an element can be zero-sized when its effect
     * first runs, and a canvas built at zero stays blank forever unless
     * something watches the *element* for its size arriving.
     */
    const measure = (): boolean => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (nextWidth === 0 || nextHeight === 0) return false;
      if (nextWidth === width && nextHeight === height) return false;

      width = nextWidth;
      height = nextHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // How deep the free band is, and how big a brush suits the frame.
      const portrait = height > width * 1.1;
      // Below the fixed header, above the type. Both edges matter: paste
      // behind the couple's own names in the nav looks like a printing fault.
      const top = portrait ? 0.10 : 0.05;
      const band = (portrait ? 0.46 : 0.68) - top;
      const scale = portrait ? 0.72 : 1;
      const unit = Math.min(width, height);

      tracks = [
        ...SMEARS.map((smear) => ({
          stamps: buildSmear(
            {
              ...smear.spec,
              points: smear.spec.points.map((p) => ({ x: p.x, y: top + p.y * band })),
              width: smear.spec.width * scale,
            },
            width,
            height,
          ),
          from: smear.at,
          to: smear.at + smear.duration,
          drawn: 0,
        })),
        ...PRINTS.map((print) => ({
          stamps: buildHandprint(
            print.cx * width,
            (top + print.cy * band) * height,
            print.size * unit * scale,
            print.rotation,
            print.core,
            print.rim,
            print.seed,
          ),
          from: print.at,
          // A hand lands; it does not sweep. Short enough to read as a press.
          to: print.at + 0.14,
          drawn: 0,
        })),
      ];
      return true;
    };

    /** Stamps everything that should be down by `time` and is not yet. */
    const advance = (time: number) => {
      for (const track of tracks) {
        if (time < track.from || track.drawn >= track.stamps.length) continue;
        const progress = Math.min(
          1,
          (time - track.from) / Math.max(0.001, track.to - track.from),
        );
        const target = Math.round(progress * track.stamps.length);
        for (let i = track.drawn; i < target; i++) drawStamp(ctx, track.stamps[i]);
        track.drawn = target;
      }
    };

    const paintAll = () => {
      ctx.clearRect(0, 0, width, height);
      for (const track of tracks) track.drawn = 0;
      advance(FINISHED);
    };

    if (measure()) {
      // Nothing is drawn until time advances — an empty frame is correct here,
      // because the paste has not gone on yet.
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      // The finished composition, straight away. Reduced motion means no
      // movement, not no picture.
      paintAll();
      const observer = new ResizeObserver(() => {
        if (measure()) paintAll();
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    let last = performance.now();

    const tick = (now: number) => {
      // Clamp, so a backgrounded tab doesn't resume by skipping the whole
      // sequence in a single step.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      advance(elapsed);

      if (elapsed >= FINISHED) {
        // Done. Stop entirely rather than spinning on a finished picture.
        complete = true;
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || complete || width === 0) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    // Hold the sequence until the frame is actually on screen. Unlike the
    // ambient layers this plays exactly once, so arriving mid-scroll and
    // missing it means missing it for good.
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
            threshold: 0.25,
          })
        : null;

    if (observer) observer.observe(canvas);
    else start();

    const sizeObserver = new ResizeObserver(() => {
      if (!measure()) return;
      if (complete || elapsed >= FINISHED) {
        // Already applied — re-lay it at the new size rather than replaying.
        paintAll();
      } else {
        // Mid-sequence: the old stamps were for the old frame, so start over.
        ctx.clearRect(0, 0, width, height);
        elapsed = 0;
        start();
      }
    });
    sizeObserver.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer?.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none h-full w-full ${className}`}
    />
  );
}
