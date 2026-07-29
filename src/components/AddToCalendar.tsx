"use client";

import { useState } from "react";
import { buildIcs, icsFilename, type CalendarEvent } from "@/lib/ics";

export type { CalendarEvent };

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
    link.download = icsFilename(calendarName);
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
