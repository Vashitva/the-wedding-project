"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A rangoli, generated from rotational symmetry rather than drawn by hand, and
 * traced on screen the way one is laid on a floor: inside out, ring by ring.
 *
 * Every path is normalised to pathLength="1", so the draw-on animation is a
 * single dashoffset per layer with no measuring — which means it scales to any
 * size and survives any stroke width.
 */

/** A symmetric lens petal pointing up, from radius `from` out to radius `to`. */
function petal(from: number, to: number, width: number): string {
  const span = to - from;
  const c1 = from + span * 0.32;
  const c2 = to - span * 0.24;
  return [
    `M 0 ${-from}`,
    `C ${width} ${-c1} ${width} ${-c2} 0 ${-to}`,
    `C ${-width} ${-c2} ${-width} ${-c1} 0 ${-from}`,
    "Z",
  ].join(" ");
}

/** A teardrop with a curled tip — the paisley that edges most rangoli. */
function paisley(from: number, to: number, width: number): string {
  const span = to - from;
  return [
    `M 0 ${-from}`,
    `C ${width} ${-(from + span * 0.3)} ${width * 0.9} ${-(to - span * 0.1)} 0 ${-to}`,
    `C ${-width * 0.55} ${-(to - span * 0.28)} ${-width * 0.2} ${-(from + span * 0.5)} 0 ${-from}`,
    "Z",
  ].join(" ");
}

type Layer = {
  paths: string[];
  /** Seconds into the sequence that this ring starts drawing. */
  delay: number;
  opacity: number;
  width: number;
};

function buildLayers(): Layer[] {
  const ring = (count: number, shape: (i: number) => string) =>
    Array.from({ length: count }, (_, i) => shape(i));

  const rotate = (i: number, count: number) => (360 / count) * i;

  return [
    // Centre bindu and the lotus at the heart of it.
    {
      paths: ["M 0 -7 A 7 7 0 1 1 0 7 A 7 7 0 1 1 0 -7 Z"],
      delay: 0,
      opacity: 0.9,
      width: 1.1,
    },
    {
      paths: ring(8, (i) => petal(9, 27, 8)).map(
        (d, i) => `__rotate(${rotate(i, 8)})__${d}`,
      ),
      delay: 0.25,
      opacity: 0.95,
      width: 1,
    },
    {
      paths: ["M 0 -32 A 32 32 0 1 1 0 32 A 32 32 0 1 1 0 -32 Z"],
      delay: 0.8,
      opacity: 0.5,
      width: 0.8,
    },
    // The broad middle ring — twelve petals, the widest gesture in the figure.
    {
      paths: ring(12, (i) => petal(34, 62, 11)).map(
        (d, i) => `__rotate(${rotate(i, 12)})__${d}`,
      ),
      delay: 1.0,
      opacity: 0.9,
      width: 1,
    },
    {
      paths: ["M 0 -67 A 67 67 0 1 1 0 67 A 67 67 0 1 1 0 -67 Z"],
      delay: 1.7,
      opacity: 0.45,
      width: 0.8,
    },
    // Outer paisley scallops, all turning the same way.
    {
      paths: ring(24, (i) => paisley(69, 84, 6)).map(
        (d, i) => `__rotate(${rotate(i, 24)})__${d}`,
      ),
      delay: 1.9,
      opacity: 0.75,
      width: 0.7,
    },
    // Dots laid between the scallops, the last thing to go down.
    {
      paths: ring(
        24,
        (i) => `M 0 -92 m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0`,
      ).map((d, i) => `__rotate(${rotate(i, 24) + 7.5})__${d}`),
      delay: 2.5,
      opacity: 0.8,
      width: 1.4,
    },
  ];
}

const LAYERS = buildLayers();

export default function Rangoli({
  className = "",
  /** Draw immediately rather than waiting to be scrolled into view. */
  immediate = false,
  /** Seconds added before the first ring starts. */
  startDelay = 0,
}: {
  className?: string;
  immediate?: boolean;
  startDelay?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setDrawing(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawing(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <svg
      ref={ref}
      viewBox="-100 -100 200 200"
      fill="none"
      aria-hidden
      className={`rangoli ${drawing ? "is-drawing" : ""} ${className}`}
    >
      {LAYERS.map((layer, layerIndex) => (
        <g key={layerIndex} opacity={layer.opacity}>
          {layer.paths.map((raw, i) => {
            // Rotation is encoded into the path string when it is generated so
            // the ring builders stay pure string functions.
            const match = raw.match(/^__rotate\(([-\d.]+)\)__(.*)$/s);
            const transform = match ? `rotate(${match[1]})` : undefined;
            const d = match ? match[2] : raw;

            return (
              <path
                key={i}
                d={d}
                transform={transform}
                pathLength={1}
                stroke="currentColor"
                strokeWidth={layer.width}
                strokeLinecap="round"
                style={{
                  // Petals in a ring come in one after another, not all at once.
                  animationDelay: `${startDelay + layer.delay + i * 0.035}s`,
                }}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
