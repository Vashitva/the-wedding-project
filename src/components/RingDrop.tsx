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
    { ...base(0), radiusScale: radius, bandScale: radius * 0.15, hasStone: false },
    { ...base(1), radiusScale: radius * 0.86, bandScale: radius * 0.1, hasStone: true },
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

/** The stone, drawn after the metal so it sits on top of its own band. */
function drawStone(ctx: CanvasRenderingContext2D, ring: Ring) {
  if (!ring.hasStone) return;

  const r = ring.radiusScale;
  const tilt = Math.max(0.05, ring.tilt);
  const s = r * 0.085;

  ctx.save();
  ctx.translate(ring.x, ring.y);
  ctx.rotate(ring.angle);

  const sy = -r * tilt;

  const halo = ctx.createRadialGradient(0, sy, 0, 0, sy, s * 3.4);
  halo.addColorStop(0, "rgba(255,255,255,0.8)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, sy, s * 3.4, 0, TAU);
  ctx.fill();

  ctx.translate(0, sy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-s / 2, -s / 2, s, s);
  // One facet, so it catches light rather than reading as a plain square.
  ctx.fillStyle = "rgba(198,220,255,0.7)";
  ctx.fillRect(-s / 2, -s / 2, s / 2, s / 2);
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

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let rings = makeRings(width, height);
    let sparks: Spark[] = [];
    const torus = createTorusRenderer();
    let elapsed = 0;

    const applySize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

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

      for (const ring of rings) drawStone(ctx, ring);
    };

    applySize();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      // No drop: the composition it would have landed in, straight away.
      rest();
      render();
      const onResize = () => {
        applySize();
        rings = makeRings(width, height);
        rest();
        render();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
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
      if (running) return;
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
    const onResize = () => {
      const wasSettled = rings.every((r) => r.settled);
      applySize();
      rings = makeRings(width, height);
      // Mid-drop, restart; already landed, stay landed rather than replaying.
      if (wasSettled) {
        rest();
        render();
      } else {
        elapsed = 0;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
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
