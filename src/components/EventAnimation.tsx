"use client";

import { useEffect, useRef } from "react";
import {
  PROFILES,
  createSystem,
  envelope,
  particleColour,
  type Particle,
  type Profile,
} from "@/lib/particles";

/**
 * Draws whichever physics an event page asked for.
 *
 * The engine steps in src/lib/particles.ts; this only paints. It is a plain
 * 2D canvas — no library — and it stops entirely when the tab is hidden or the
 * canvas scrolls off screen, because a wedding site should not spin a phone's
 * fan while nobody is looking at it.
 */

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle, alpha: number, colour: string) {
  // The flutter phase narrows the petal as it turns edge-on, then fills back
  // out — the same value that swings it sideways in the simulation.
  const face = Math.abs(Math.cos(p.flutter));
  const w = p.size * (0.22 + face * 0.78);
  const h = p.size;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.globalAlpha = alpha;

  // Edge-on petals catch less light, which reads as the petal turning.
  const shade = ctx.createLinearGradient(0, -h, 0, h);
  shade.addColorStop(0, colour);
  shade.addColorStop(1, "rgba(255,255,255,0.65)");
  ctx.fillStyle = shade;

  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w, -h * 0.45, w, h * 0.55, 0, h);
  ctx.bezierCurveTo(-w, h * 0.55, -w, -h * 0.45, 0, -h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPowder(ctx: CanvasRenderingContext2D, p: Particle, alpha: number, colour: string) {
  // Grains are too small for shape to matter; a soft disc is enough, and far
  // cheaper across a couple of hundred of them.
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Glow sprites, drawn once per colour and then blitted.
 *
 * Building a radial gradient per particle per frame means ninety allocations
 * every 16ms; caching one sprite per colour and scaling it costs nothing.
 */
const spriteCache = new Map<string, HTMLCanvasElement>();
const SPRITE_RADIUS = 32;

function moteSprite(colour: string): HTMLCanvasElement {
  const cached = spriteCache.get(colour);
  if (cached) return cached;

  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_RADIUS * 2;
  const sctx = sprite.getContext("2d")!;

  const glow = sctx.createRadialGradient(
    SPRITE_RADIUS, SPRITE_RADIUS, 0,
    SPRITE_RADIUS, SPRITE_RADIUS, SPRITE_RADIUS,
  );
  glow.addColorStop(0, colour);
  glow.addColorStop(0.22, colour);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = glow;
  sctx.fillRect(0, 0, SPRITE_RADIUS * 2, SPRITE_RADIUS * 2);

  spriteCache.set(colour, sprite);
  return sprite;
}

function drawMote(ctx: CanvasRenderingContext2D, p: Particle, alpha: number, colour: string) {
  const sprite = moteSprite(colour);
  const r = p.size * 4;
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
}

function paint(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  profile: Profile,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);

  particles.forEach((p, i) => {
    const alpha = p.alpha * envelope(p);
    if (alpha <= 0.01) return;
    const colour = particleColour(profile, i);

    if (p.kind === "petal") drawPetal(ctx, p, alpha, colour);
    else if (p.kind === "powder") drawPowder(ctx, p, alpha, colour);
    else drawMote(ctx, p, alpha, colour);
  });

  ctx.globalAlpha = 1;
}

export default function EventAnimation({
  animation,
  className = "",
}: {
  animation: keyof typeof PROFILES;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const profile = PROFILES[animation];
    if (!profile) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const system = createSystem(profile, width, height);

    const applySize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      // Cap the device pixel ratio: a 3x phone screen triples the fill cost for
      // soft-edged particles nobody can resolve anyway.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      system.resize(width, height);
    };

    applySize();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Reduced motion still gets the scene — just one frame of it, held still.
    if (reduce.matches) {
      paint(ctx, system.particles, profile, width, height);
      const onResize = () => {
        applySize();
        paint(ctx, system.particles, profile, width, height);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let frame = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      // Clamp dt so a backgrounded tab doesn't resume with one enormous step
      // that teleports every particle off screen.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      system.step(dt, now / 1000);
      paint(ctx, system.particles, profile, width, height);
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

    // Only run while actually on screen and in a visible tab.
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? start() : stop()),
            { threshold: 0 },
          )
        : null;

    if (observer) observer.observe(canvas);
    else start();

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!observer || canvas.getBoundingClientRect().bottom > 0) start();
    };

    const onResize = () => applySize();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [animation]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none h-full w-full ${className}`}
    />
  );
}
