"use client";

import { useState } from "react";

export type CalendarEvent = {
  id: string;
  name: string;
  start: string;
  end?: string;
  venue: string;
  address: string;
  description: string;
};

function toIcsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Folds long lines and escapes the characters iCalendar treats specially. */
function icsLine(name: string, value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

  const line = `${name}:${escaped}`;
  if (line.length <= 74) return line;

  const chunks: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    chunks.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

function buildIcs(events: CalendarEvent[], calendarName: string): string {
  const stamp = toIcsStamp(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//the-wedding-project//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    icsLine("X-WR-CALNAME", calendarName),
  ];

  for (const event of events) {
    const end =
      event.end ??
      new Date(new Date(event.start).getTime() + 2 * 60 * 60 * 1000).toISOString();

    lines.push(
      "BEGIN:VEVENT",
      icsLine("UID", `${event.id}@the-wedding-project`),
      icsLine("DTSTAMP", stamp),
      icsLine("DTSTART", toIcsStamp(event.start)),
      icsLine("DTEND", toIcsStamp(end)),
      icsLine("SUMMARY", event.name),
      icsLine("LOCATION", `${event.venue}, ${event.address}`),
      icsLine("DESCRIPTION", event.description),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function AddToCalendar({
  events,
  calendarName,
  label = "Add to calendar",
  className = "btn btn-ghost",
}: {
  events: CalendarEvent[];
  calendarName: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  const download = () => {
    const blob = new Blob([buildIcs(events, calendarName)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${calendarName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on the next tick so Safari has the blob when the click resolves.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <button type="button" onClick={download} className={className}>
      {done ? "Downloaded" : label}
    </button>
  );
}
