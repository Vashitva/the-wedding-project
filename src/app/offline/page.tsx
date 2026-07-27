import type { Metadata } from "next";
import Link from "next/link";
import { wedding } from "@config/wedding";
import { formatTimeRange, groupEventsByDay } from "@/lib/format";

export const metadata: Metadata = { title: "Offline" };

/**
 * Shown when a page is requested with no connection. Kept fully static so the
 * service worker can precache it, and it carries the schedule — the one thing
 * a guest standing in a field actually needs.
 */
export default function OfflinePage() {
  const days = groupEventsByDay(wedding.events);

  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-24">
      <div className="text-center">
        <p className="eyebrow mb-4">No connection</p>
        <h1 className="font-display text-4xl">You&rsquo;re offline</h1>
        <p className="mt-4 text-ink-soft">
          Here&rsquo;s the weekend from memory. Everything else will be back when you
          have signal.
        </p>
      </div>

      <div className="diamond my-10" />

      {days.map((day) => (
        <div key={day.key} className="mb-10">
          <h2 className="font-display text-2xl text-olive">{day.label}</h2>
          <div className="rule mt-3 mb-5" />
          <ul className="space-y-5">
            {day.events.map((event) => (
              <li key={event.id}>
                <p className="text-sm text-ink-faint tabular-nums">
                  {formatTimeRange(event.start, event.end)}
                </p>
                <p className="font-display text-xl">{event.name}</p>
                <p className="text-sm text-ink-soft">
                  {event.venue} · {event.address}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-center">
        <Link href="/" className="btn btn-ghost">
          Try again
        </Link>
      </p>
    </main>
  );
}
