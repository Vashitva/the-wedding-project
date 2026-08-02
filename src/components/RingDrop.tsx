"use client";

import { useEffect, useRef } from "react";
import { createTorusRenderer, type TorusPose } from "@/lib/torus";

/**
 * Two gold rings dropped into the frame: they fall, bounce, spin down, and
 * settle interlocked.
 *
 * The fall is real ballistics — gravity, restitution, angular momentum, energy
 * lost on every contact. The landing is a critically damped spring onto a fixed
 * pose, because a freely tumbling rigid body will not reliably come to rest in
 * a composition worth looking at, and this one has to land the same way every
 * time.
 *
 * The two rings are a plain wide band and a slimmer one with a stone — the way
 * a pair actually differs. Nothing here encodes who wears which.
 *
 * They are shaded as real tori (src/lib/torus.ts), and both rings' facets go
 * into one depth-sorted buffer — so giving them different yaws puts them in
 * different planes and the interlock is genuine occlusion rather than a
 * clipping trick.
 */

const TAU = Math.PI * 2;

type Ring = {
  /** Geometry, in fractions of the reference radius. */
  radiusScale: number;
  bandScale: number;
  hasStone: boolean;

  x: number;
  y: number;
  vx: number;
  vy: number;

  /** Rotation in the picture plane. */
  angle: number;
  spin: number;
  /** Rotation about the vertical axis. Fixed per ring; sets its plane. */
  yaw: number;
  /** 0 = edge-on, 1 = face-on. Foreshortening, i.e. how far it has tipped. */
  tilt: number;
  tiltVel: number;

  /** Seconds before this ring is released. */
  delay: number;
  bounces: number;
  settled: boolean;

  restX: number;
  restY: number;
  restAngle: number;
  restTilt: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

/**
 * Where the rings come to rest, as a fraction of the frame. The simulation,
 * the renderer and the rest pose all have to agree on it, so it lives here
 * rather than being written out three times.
 */
const floorFor = (height: number) => height * 0.32;

const GRAVITY = 1950;
const RESTITUTION = 0.46;
/** Below this impact speed a bounce is not worth simulating. */
const SETTLE_SPEED = 190;

function makeRings(width: number, height: number): Ring[] {
  const radius = Math.min(width * 0.115, height * 0.2, 148);
  // Sits in the upper third: the type owns the bottom of the frame.
  const floor = floorFor(height);
  const cx = width / 2;
  // Closer than two radii, so they finish overlapping rather than merely adjacent.
  const spread = radius * 0.62;

  const base = (i: number): Omit<Ring, "radiusScale" | "bandScale" | "hasStone"> => ({
    x: cx + (i === 0 ? -spread : spread) + (i === 0 ? -radius * 0.5 : radius * 0.45),
    y: -height * (i === 0 ? 0.34 : 0.62),
    vx: i === 0 ? 26 : -34,
    vy: 0,
    angle: i === 0 ? -0.9 : 1.2,
    spin: i === 0 ? 3.4 : -4.1,
    // Opposite yaws: the two rings sit in visibly different planes, which is
    // what lets the depth sort weave them instead of stacking them.
    yaw: i === 0 ? 0.38 : -0.34,
    // They come in tipped and settle towards face-on as they lose energy.
    tilt: 0.22,
    tiltVel: 0,
    delay: i === 0 ? 0.15 : 0.55,
    bounces: 0,
    settled: false,
    restX: cx + (i === 0 ? -spread : spread),
    restY: floor,
    restAngle: i === 0 ? -0.13 : 0.1,
    restTilt: i === 0 ? 0.82 : 0.88,
  });

  return [
    // The plain band, and the slimmer solitaire beside it.
    { ...base(0), radiusScale: radius, bandScale: radius * 0.058, hasStone: false },
    { ...base(1), radiusScale: radius * 0.88, bandScale: radius * 0.046, hasStone: true },
  ];
}

/* ── Drawing ─────────────────────────────────────────────────────────── */

const GOLD: [number, number, number] = [0.94, 0.73, 0.36];
/** The slimmer ring reads a shade cooler, the way a different alloy would. */
const PALE_GOLD: [number, number, number] = [0.9, 0.75, 0.47];

function poseOf(ring: Ring): TorusPose {
  return {
    cx: ring.x,
    cy: ring.y,
    R: ring.radiusScale,
    a: ring.bandScale,
    // Never fully edge-on: at exactly zero the surface has no area to shade.
    tilt: Math.max(0.05, Math.min(1, ring.tilt)),
    yaw: ring.yaw,
    roll: ring.angle,
    albedo: ring.hasStone ? PALE_GOLD : GOLD,
  };
}

/* ── The stone ───────────────────────────────────────────────────────── */

type Facet = {
  /** Corners in unit space: 1 is the girdle radius. */
  pts: [number, number][];
  /** Direction of the centroid — this is what turns as the ring rolls. */
  angle: number;
  radius: number;
  /** Base reflectance. The table returns most light; the girdle facets least. */
  tone: number;
  /** Dispersion bias, negative cool and positive warm. */
  fire: number;
  /** Fixed phase offset, so neighbours light up out of step with each other. */
  seed: number;
};

const polar = (a: number, r: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];

/**
 * A round brilliant, laid out once and reused every frame.
 *
 * Thirty-three crown facets — the table, eight kites, eight stars and sixteen
 * upper girdle facets — which is the real count for the cut. Getting the
 * arrangement right matters far more than shading any one facet well: the eye
 * recognises the pattern of a brilliant long before it reads a highlight.
 */
const BRILLIANT: Facet[] = (() => {
  const facets: Facet[] = [];
  const step = TAU / 8;
  const TABLE = 0.5;
  const SHOULDER = 0.78;

  /** Table vertex. */
  const T = (k: number) => polar(k * step, TABLE);
  /** Where a kite meets its neighbouring star, half a step round. */
  const S = (k: number) => polar((k + 0.5) * step, SHOULDER);
  /** Girdle, sixteen points around. */
  const G = (j: number) => polar(j * step * 0.5, 1);

  const add = (pts: [number, number][], tone: number, fire: number, seed: number) => {
    let x = 0;
    let y = 0;
    for (const p of pts) {
      x += p[0];
      y += p[1];
    }
    x /= pts.length;
    y /= pts.length;
    facets.push({
      pts,
      angle: Math.atan2(y, x),
      radius: Math.hypot(x, y),
      tone,
      fire,
      seed,
    });
  };

  // Table first — everything else is painted around it.
  add(
    Array.from({ length: 8 }, (_, k) => T(k)),
    1,
    0,
    0,
  );

  for (let k = 0; k < 8; k++) {
    // Kite: apex on the table, lateral corners either side, point on the girdle.
    add([T(k), S(k - 1), G(2 * k), S(k)], 0.92, k % 2 ? 0.5 : -0.4, k * 1.7);
    // Star: sits on a table edge and reaches out between two kites.
    add([T(k), T(k + 1), S(k)], 0.86, k % 3 ? -0.6 : 0.7, k * 2.9 + 0.8);
    // Upper girdle facets, in pairs either side of the star's outer point.
    // Deliberately unequal: a uniformly dark outer band would read as a sphere's
    // terminator rather than as a row of facets.
    add([S(k), G(2 * k), G(2 * k + 1)], 0.9, 0.8, k * 3.7 + 1.9);
    add([S(k), G(2 * k + 1), G(2 * k + 2)], 0.74, -0.8, k * 4.3 + 3.1);
  }

  return facets;
})();

/** Fixed in screen space: the stone is lit by the room, not by its own frame. */
const STONE_LIGHT = -Math.PI * 0.58;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The stone, drawn after the metal so it sits on top of its own band.
 *
 * @param time seconds since the animation started, so the scintillation carries
 *   on after the rings have stopped moving. A diamond on a still hand still
 *   sparkles — the room moves even when the ring does not.
 */
function drawStone(ctx: CanvasRenderingContext2D, ring: Ring, time: number) {
  if (!ring.hasStone) return;

  const r = ring.radiusScale;
  const tilt = Math.max(0.05, Math.min(1, ring.tilt));
  // Proportional to the band, with a floor: on a phone the ring is small enough
  // that a strictly scaled stone would land under ten pixels and lose its cut.
  const s = Math.max(r * 0.17, 9);
  // Mounted on the outer face of the band, standing proud of the setting.
  const sy = -(r + ring.bandScale * 1.2) * tilt - s * 0.22;

  ctx.save();
  ctx.translate(ring.x, ring.y);
  ctx.rotate(ring.angle);
  ctx.translate(0, sy);

  // Scatter. A diamond throws light onto everything immediately around it, and
  // without this the stone reads as a sticker rather than as something lit.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 3.2);
  halo.addColorStop(0, "rgba(255,255,255,0.55)");
  halo.addColorStop(0.4, "rgba(240,246,255,0.15)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, s * 3.2, 0, TAU);
  ctx.fill();

  // Facets flash as the stone turns; that sweep is most of what sells it.
  const flash = Math.pow(Math.abs(Math.cos(ring.angle * 1.5 + time * 0.7)), 6);

  ctx.save();
  // The stone stands up out of the band, so it faces the camera more squarely
  // than the ring does — only lightly foreshortened, never as flat as the band.
  ctx.scale(s, s * (0.68 + 0.32 * tilt));
  ctx.lineJoin = "round";

  // Claws: four tapered prongs reaching in over the girdle. Drawn under the
  // crown so only their tips show, which is how a setting actually looks.
  ctx.fillStyle = "#c19a55";
  for (let k = 0; k < 4; k++) {
    const a = (k + 0.5) * (TAU / 4);
    ctx.save();
    ctx.translate(Math.cos(a) * 0.94, Math.sin(a) * 0.94);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.26, 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.lineWidth = 1.2 / s;
  for (const facet of BRILLIANT) {
    // The table's centroid is at the origin, so it has no direction to light —
    // give it a steady value instead of a meaningless one.
    const facing =
      facet.radius < 0.08 ? 0.62 : Math.cos(facet.angle + ring.angle - STONE_LIGHT);

    // Scintillation. Inside a real stone each facet is at its own angle, so
    // they come alight out of step with one another rather than as a smooth
    // gradient — that scatter is the difference between a diamond and a bead.
    const twinkle = 0.5 + 0.5 * Math.sin(facet.seed + ring.angle * 3.2 + time * 1.7);

    let v = facet.tone * (0.52 + 0.2 * facing + 0.3 * twinkle);
    v += Math.pow(Math.max(0, facing), 12) * (0.35 + 0.4 * flash);
    v = Math.max(0, Math.min(1, v));

    // Dispersion: the facets that aren't blazing split the light a little.
    const warm = facet.fire * (1 - v) * 34;

    const cr = Math.min(255, Math.round(mix(196, 255, v) + warm));
    const cg = Math.min(255, Math.round(mix(208, 255, v) + warm * 0.3));
    const cb = Math.min(255, Math.round(mix(226, 255, v) - warm * 0.6));

    ctx.beginPath();
    ctx.moveTo(facet.pts[0][0], facet.pts[0][1]);
    for (let i = 1; i < facet.pts.length; i++) {
      ctx.lineTo(facet.pts[i][0], facet.pts[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fill();
    // Facet edges are visible on a real stone, and a hairline stroke also closes
    // the antialiasing seams between neighbours.
    ctx.strokeStyle = `rgba(255,255,255,0.55)`;
    ctx.stroke();
  }

  // Prong tips, folded over the girdle.
  ctx.fillStyle = "#e6c684";
  for (let k = 0; k < 4; k++) {
    const a = (k + 0.5) * (TAU / 4);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 0.84, Math.sin(a) * 0.84, 0.13, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // The glint. It belongs to the eye, not to the stone, so it does not rotate
  // with the ring and it is not squashed with it.
  ctx.rotate(-ring.angle);
  const reach = s * (0.9 + 1.4 * flash);
  const waist = s * 0.09;
  ctx.globalAlpha = 0.4 + 0.5 * flash;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = k * (TAU / 4);
    const [px, py] = polar(a, reach);
    const [wx, wy] = polar(a + TAU / 8, waist);
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, ring: Ring, floorY: number) {
  const height = Math.max(0, floorY - ring.y);
  // Higher up means a larger, fainter contact shadow.
  const spread = 1 + height / 260;
  const alpha = Math.max(0, 0.22 - height / 1400);
  if (alpha <= 0.01) return;

  const rx = ring.radiusScale * 1.05 * spread;
  const ry = ring.radiusScale * 0.16 * spread;

  const g = ctx.createRadialGradient(ring.x, floorY + ring.radiusScale * 0.5, 0, ring.x, floorY + ring.radiusScale * 0.5, rx);
  g.addColorStop(0, `rgba(120, 96, 54, ${alpha})`);
  g.addColorStop(1, "rgba(120, 96, 54, 0)");

  ctx.save();
  ctx.translate(ring.x, floorY + ring.radiusScale * 0.5);
  ctx.scale(1, ry / rx);
  ctx.translate(-ring.x, -(floorY + ring.radiusScale * 0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ring.x, floorY + ring.radiusScale * 0.5, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export default function RingDrop({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rings: Ring[] = [];
    let sparks: Spark[] = [];
    const torus = createTorusRenderer();
    let elapsed = 0;

    /**
     * Reads the element's size and rebuilds anything that depends on it.
     *
     * The ring geometry is derived from the frame, so measuring has to come
     * before building — and it has to be able to happen again. An element can
     * be zero-sized when its effect first runs (layout not settled, a web font
     * still swapping, a mobile browser mid address-bar transition), and a
     * canvas built at zero stays blank forever: its backing store is zero, the
     * rings have zero radius, and nothing paints. A window `resize` never
     * arrives to correct it, because the window did not resize — the element
     * did.
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
      return true;
    };

    const hasSize = () => width > 0 && height > 0;

    const rest = () => {
      for (const ring of rings) {
        ring.x = ring.restX;
        ring.y = ring.restY;
        ring.angle = ring.restAngle;
        ring.tilt = ring.restTilt;
        ring.settled = true;
        ring.vx = ring.vy = ring.spin = ring.tiltVel = 0;
      }
    };

    const render = () => {
      if (!hasSize()) return;
      ctx.clearRect(0, 0, width, height);
      const floorY = floorFor(height);

      for (const ring of rings) drawShadow(ctx, ring, floorY);

      for (const spark of sparks) {
        const t = 1 - spark.life / spark.maxLife;
        ctx.globalAlpha = Math.max(0, t) * 0.9;
        ctx.fillStyle = "#f6dfa8";
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Both rings go into one buffer and are painted in depth order, so where
      // they cross, whichever is actually nearer wins.
      torus.reset();
      for (const ring of rings) torus.collect(poseOf(ring));
      torus.flush(ctx);

      for (const ring of rings) drawStone(ctx, ring, elapsed);
    };

    if (measure()) rings = makeRings(width, height);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      // No drop: the composition it would have landed in, straight away.
      rest();
      render();

      // Watches the element, not the window. If the canvas was zero-sized at
      // mount this is what eventually gives it a picture at all.
      const observer = new ResizeObserver(() => {
        if (!measure()) return;
        rings = makeRings(width, height);
        rest();
        render();
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    let frame = 0;
    let last = performance.now();
    let running = false;

    const step = (dt: number) => {
      elapsed += dt;
      const floorY = floorFor(height);

      for (const ring of rings) {
        if (elapsed < ring.delay) continue;

        if (!ring.settled) {
          ring.vy += GRAVITY * dt;
          ring.x += ring.vx * dt;
          ring.y += ring.vy * dt;
          ring.angle += ring.spin * dt;
          // Air resistance on the spin, so it slows as it falls.
          ring.spin *= 1 - Math.min(1, 0.7 * dt);
          ring.tilt += ring.tiltVel * dt;

          if (ring.y >= floorY && ring.vy > 0) {
            ring.y = floorY;
            ring.vy = -ring.vy * RESTITUTION;
            ring.vx *= 0.82;
            // Contact converts some spin into tip, which is how a dropped ring
            // wobbles flat rather than staying on edge.
            ring.spin *= -0.45;
            ring.tiltVel += 0.9;
            ring.bounces += 1;

            for (let i = 0; i < 9; i++) {
              const a = Math.random() * Math.PI - Math.PI;
              const speed = 60 + Math.random() * 190;
              sparks.push({
                x: ring.x + (Math.random() - 0.5) * ring.radiusScale,
                y: floorY,
                vx: Math.cos(a) * speed,
                vy: -Math.abs(Math.sin(a)) * speed * 0.8,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.5,
                size: 1 + Math.random() * 2.2,
              });
            }

            if (Math.abs(ring.vy) < SETTLE_SPEED || ring.bounces >= 4) {
              ring.settled = true;
            }
          }
        } else {
          // Critically damped spring onto the final pose: no overshoot, and it
          // arrives in the same place every time.
          const k = 58;
          const c = 2 * Math.sqrt(k);
          const ax = (ring.restX - ring.x) * k - ring.vx * c;
          const ay = (ring.restY - ring.y) * k - ring.vy * c;
          ring.vx += ax * dt;
          ring.vy += ay * dt;
          ring.x += ring.vx * dt;
          ring.y += ring.vy * dt;

          ring.spin += ((ring.restAngle - ring.angle) * k - ring.spin * c) * dt;
          ring.angle += ring.spin * dt;

          ring.tiltVel += ((ring.restTilt - ring.tilt) * k - ring.tiltVel * c) * dt;
          ring.tilt += ring.tiltVel * dt;
        }
      }

      for (const spark of sparks) {
        spark.life += dt;
        spark.vy += 1200 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
      }
      sparks = sparks.filter((s) => s.life < s.maxLife);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      step(dt);
      render();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      // Refusing to start without a size is what makes recovery possible: the
      // ResizeObserver below calls start() again once the element has one.
      if (running || !hasSize()) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    // Hold the drop until the frame is actually on screen, so nobody misses it
    // by arriving mid-scroll.
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
            threshold: 0.15,
          })
        : null;

    if (observer) observer.observe(canvas);
    else start();

    const onVisibility = () => (document.hidden ? stop() : start());

    /*
     * Resizes come from the element, not the window — a canvas can go from
     * zero to its real size without the window changing at all, which is
     * exactly the case that used to leave the frame permanently blank.
     */
    const sizeObserver = new ResizeObserver(() => {
      if (!measure()) return;

      const firstSize = rings.length === 0;
      const wasSettled = !firstSize && rings.every((r) => r.settled);
      rings = makeRings(width, height);

      if (firstSize) {
        // The rings never existed; play the drop properly now that there is a
        // frame to drop into.
        elapsed = 0;
        start();
      } else if (wasSettled) {
        // Already landed — re-lay the composition rather than replaying it.
        rest();
        render();
      } else {
        elapsed = 0;
      }
    });
    sizeObserver.observe(canvas);

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
