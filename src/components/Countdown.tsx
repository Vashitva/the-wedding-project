"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remainingUntil(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/**
 * Counts down to the ceremony. Rendered empty on the server and on the first
 * client paint so the markup can't mismatch — the clock only exists once
 * hydrated.
 */
export default function Countdown({ date }: { date: string }) {
  const target = new Date(date).getTime();
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemaining(remainingUntil(target));
    const id = setInterval(() => setRemaining(remainingUntil(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  // Reserve the vertical space so the hero doesn't jump when the clock starts.
  if (!mounted) return <div aria-hidden className="h-[72px]" />;

  if (!remaining) {
    return (
      <p className="font-display text-2xl text-olive">
        Today&rsquo;s the day.
      </p>
    );
  }

  const units: [string, number][] = [
    ["days", remaining.days],
    ["hours", remaining.hours],
    ["minutes", remaining.minutes],
    ["seconds", remaining.seconds],
  ];

  return (
    <div
      className="flex items-start justify-center gap-6 sm:gap-10"
      role="timer"
      aria-live="off"
      aria-label={`${remaining.days} days until the wedding`}
    >
      {units.map(([label, value]) => (
        <div key={label} className="text-center">
          <div className="font-display text-3xl sm:text-4xl leading-none tabular-nums">
            {String(value).padStart(2, "0")}
          </div>
          <div className="eyebrow mt-2">{label}</div>
        </div>
      ))}
    </div>
  );
}
