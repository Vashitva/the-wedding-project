import { wedding } from "@config/wedding";

/**
 * All formatting pins the wedding's own time zone. Guests in other zones see
 * the local time of the event, which is the only time that matters — and it
 * keeps server and client renders identical.
 */
const TZ = wedding.timeZone;

/**
 * A bare `YYYY-MM-DD` is parsed as UTC midnight, so rendering it in a western
 * time zone lands on the *previous* day — `2027-03-27` printed as 26 March.
 * Anchoring at midday puts it far enough from either boundary that no offset
 * can move it across one.
 *
 * Strings that already carry a time are left alone: those are real instants,
 * and shifting them would be wrong.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function instant(iso: string): Date {
  return new Date(DATE_ONLY.test(iso) ? `${iso}T12:00:00` : iso);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(instant(iso));
}

export function formatDayAndMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(instant(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  })
    .format(new Date(iso))
    .replace(/\s?([ap])m/i, (_, m: string) => m.toLowerCase() + "m");
}

export function formatTimeRange(start: string, end?: string): string {
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

/** Groups events into calendar days, preserving the configured order. */
export function groupEventsByDay<T extends { start: string }>(events: readonly T[]) {
  const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: TZ,
    }).format(new Date(iso));

  const days: { key: string; label: string; events: T[] }[] = [];

  for (const event of [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  )) {
    const key = dayKey(event.start);
    let day = days.find((d) => d.key === key);
    if (!day) {
      day = { key, label: formatDayAndMonth(event.start), events: [] };
      days.push(day);
    }
    day.events.push(event);
  }

  return days;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
