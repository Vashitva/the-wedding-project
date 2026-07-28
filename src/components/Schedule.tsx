"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "@config/wedding";
import { formatDayAndMonth, formatTimeRange, mapsUrl } from "@/lib/format";
import AddToCalendar from "./AddToCalendar";
import Rangoli from "./Rangoli";

/**
 * The weekend as a procession rather than a list: one full-bleed panel per
 * function, each in the colour that function actually is, moved through
 * sideways. The ambient glow behind the track follows whichever one you are
 * looking at.
 */

const events = [...wedding.events].sort(
  (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
);

export default function Schedule() {
  const trackRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  /* Which panel is nearest the centre of the track. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const centre = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;

      Array.from(track.children).forEach((child, i) => {
        const el = child as HTMLElement;
        const mid = el.offsetLeft + el.offsetWidth / 2;
        const distance = Math.abs(mid - centre);
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });

      setActive(nearest);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = track.children[index] as HTMLElement | undefined;
    if (!target) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  const current = events[active] ?? events[0];

  return (
    <section
      id="schedule"
      className="relative overflow-hidden py-16 sm:py-20"
      style={{ backgroundColor: "#0e0805" }}
    >
      {/* Ambient glow in the colour of whichever function is in view. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% 45%, ${current.palette.accent}22, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[46rem] max-w-[110vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.07] transition-colors duration-1000"
        style={{ color: current.palette.accent }}
      >
        <Rangoli />
      </div>

      <div className="relative">
        <header className="mx-auto mb-9 max-w-6xl px-5 text-center">
          <p
            className="eyebrow mb-4 transition-colors duration-700"
            style={{ color: current.palette.accent }}
          >
            Three days
          </p>
          <h2 className="font-display text-4xl text-[#f6ece0] sm:text-5xl">
            The Procession
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-[#c4ac97]">
            Each function has its own colour, and the weekend moves through them.
            Slide across — the ones marked <em>by invitation</em>{" "}
            are on your card if they&rsquo;re yours.
          </p>
        </header>

        {/* The track ------------------------------------------------------ */}
        <ol
          ref={trackRef}
          tabIndex={0}
          aria-label="Schedule of functions"
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[max(1.25rem,calc(50vw-23rem))] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {events.map((event, i) => (
            <li
              key={event.id}
              className="w-[min(88vw,46rem)] shrink-0 snap-center"
              aria-current={i === active ? "true" : undefined}
            >
              <article
                className="flex h-full min-h-[min(58vh,27rem)] flex-col justify-between p-7 transition-all duration-700 sm:p-10"
                style={{
                  backgroundColor: event.palette.bg,
                  color: event.palette.ink,
                  // The panel you are looking at sits forward of the others.
                  opacity: i === active ? 1 : 0.45,
                  transform: i === active ? "scale(1)" : "scale(0.965)",
                }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p
                      className="eyebrow !text-[0.625rem]"
                      style={{ color: event.palette.accent }}
                    >
                      {formatDayAndMonth(event.start)}
                    </p>
                    <p className="mt-1 text-sm tabular-nums opacity-70">
                      {formatTimeRange(event.start, event.end)}
                    </p>
                  </div>

                  <span
                    className="font-display text-5xl leading-none opacity-25 sm:text-6xl"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="py-6">
                  <h3 className="font-display text-4xl leading-[0.95] sm:text-6xl">
                    {event.name}
                  </h3>
                  {event.optional && (
                    <span
                      className="eyebrow mt-4 inline-block !text-[0.625rem]"
                      style={{ color: event.palette.accent }}
                    >
                      By invitation
                    </span>
                  )}
                  <p className="mt-5 max-w-xl leading-relaxed opacity-85">
                    {event.description}
                  </p>
                </div>

                <dl className="space-y-1.5 text-sm">
                  <div>
                    <dt className="sr-only">Venue</dt>
                    <dd>
                      <a
                        href={mapsUrl(event.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-current/30 underline-offset-4 transition-colors hover:decoration-current"
                        style={{ color: event.palette.accent }}
                      >
                        {event.venue}
                      </a>
                      <span className="opacity-60"> · {event.address}</span>
                    </dd>
                  </div>
                  {event.dressCode && (
                    <div className="flex gap-2 opacity-60">
                      <dt>Wear:</dt>
                      <dd>{event.dressCode}</dd>
                    </div>
                  )}
                </dl>
              </article>
            </li>
          ))}
        </ol>

        {/* Controls ------------------------------------------------------- */}
        <div className="mx-auto mt-7 flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-4 px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label="Previous function"
              className="border border-[#4a3a30] px-4 py-2 text-[#e0cdb9] transition-colors hover:border-current disabled:opacity-30"
            >
              ←
            </button>

            {/* Ticks double as a jump list. */}
            <ol className="flex items-center gap-1.5">
              {events.map((event, i) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to ${event.name}`}
                    aria-current={i === active ? "true" : undefined}
                    className="h-6 px-0.5"
                  >
                    <span
                      className="block h-1.5 transition-all duration-500"
                      style={{
                        width: i === active ? "2.25rem" : "0.75rem",
                        backgroundColor:
                          i === active ? event.palette.accent : "#4a3a30",
                      }}
                    />
                  </button>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => goTo(Math.min(events.length - 1, active + 1))}
              disabled={active === events.length - 1}
              aria-label="Next function"
              className="border border-[#4a3a30] px-4 py-2 text-[#e0cdb9] transition-colors hover:border-current disabled:opacity-30"
            >
              →
            </button>
          </div>

          <AddToCalendar
            events={[...wedding.events]}
            calendarName={`${wedding.siteName} weekend`}
            label="Add the whole weekend"
            className="btn border border-[#4a3a30] text-[#e0cdb9] transition-colors hover:border-current"
          />
        </div>
      </div>
    </section>
  );
}
