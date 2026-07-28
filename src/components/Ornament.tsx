/**
 * Section divider: an eight-petal lotus rosette between two hairlines.
 *
 * The lotus is the motif that turns up everywhere in Indian wedding
 * stationery, and drawn this small it reads as ornament rather than as an
 * illustration of anything. Pure geometry, so it inherits colour and scales
 * cleanly.
 */
export default function Ornament({ className = "" }: { className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <div aria-hidden className={`flex items-center justify-center gap-4 ${className}`}>
      <span className="h-px w-12 bg-linear-to-r from-transparent to-line sm:w-20" />

      <svg
        width="26"
        height="26"
        viewBox="-13 -13 26 26"
        fill="none"
        className="shrink-0 text-gold"
      >
        {petals.map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-6"
            rx="2.6"
            ry="5.4"
            transform={`rotate(${angle})`}
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.85"
          />
        ))}
        <circle r="1.9" stroke="currentColor" strokeWidth="0.7" />
      </svg>

      <span className="h-px w-12 bg-linear-to-l from-transparent to-line sm:w-20" />
    </div>
  );
}
