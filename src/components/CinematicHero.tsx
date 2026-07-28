"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { wedding } from "@config/wedding";
import { formatDate } from "@/lib/format";
import Countdown from "./Countdown";
import AddToCalendar from "./AddToCalendar";
import Rangoli from "./Rangoli";

/**
 * The landing: a full-bleed graded frame — backdrop, scrim, vignette, grain —
 * with the type entering like a title sequence and drifting away as you scroll
 * into the (deliberately quieter) rest of the page.
 */
export default function CinematicHero() {
  const { media } = wedding.hero;
  const ceremony = wedding.events.find((e) => e.id === "ceremony") ?? wedding.events[0];

  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /* Parallax: the type leaves faster than the backdrop. */
  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const height = window.innerHeight;
      // Stop doing work the moment the frame is off screen.
      if (y > height) return;

      const progress = Math.min(1, y / height);
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
        contentRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.6));
      }
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  // A clip is motion; reduced-motion browsers get the poster frame instead.
  const showVideo = Boolean(media.video) && !reducedMotion;
  const stillImage = media.image || media.poster;

  return (
    <section className="cinema relative h-[100svh] min-h-[36rem] w-full overflow-hidden">
      {/* Backdrop ------------------------------------------------------- */}
      <div ref={backdropRef} className="absolute inset-0 will-change-transform">
        <div className={`absolute inset-0 ${reducedMotion ? "" : "cinema-kenburns"}`}>
          {showVideo ? (
            <video
              className="h-full w-full object-cover"
              style={{ objectPosition: media.focalPoint }}
              src={media.video}
              poster={media.poster || undefined}
              autoPlay
              muted
              loop
              playsInline
              // Decorative: the page says everything the clip does.
              aria-hidden
            />
          ) : stillImage ? (
            <img
              src={stillImage}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
              style={{ objectPosition: media.focalPoint }}
            />
          ) : (
            <div className="cinema-atmosphere absolute inset-0" />
          )}
        </div>
      </div>

      {/* Grade ---------------------------------------------------------- */}
      <div
        aria-hidden
        className="cinema-scrim absolute inset-0"
        style={{ opacity: media.scrim }}
      />
      <div aria-hidden className="cinema-vignette absolute inset-0" />
      <div aria-hidden className="cinema-grain absolute inset-0 overflow-hidden" />

      {/* Type ----------------------------------------------------------- */}
      <div
        ref={contentRef}
        className="relative flex h-full flex-col items-center justify-center px-5 text-center will-change-transform"
      >
        {/*
          Laid behind the names the way a rangoli is laid at a threshold —
          traced ring by ring while the title comes into focus.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 w-[34rem] max-w-[125vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.3] text-[color:var(--cinema-gold)] sm:w-[42rem]"
        >
          <Rangoli immediate startDelay={0.6} />
        </div>

        {wedding.hero.script && (
          <p
            className="cinema-fade font-deva text-xl text-[color:var(--cinema-gold)] sm:text-2xl"
            style={{ animationDelay: "250ms" }}
            lang="hi"
          >
            {wedding.hero.script}
          </p>
        )}

        <p
          className={`eyebrow cinema-fade !text-[color:var(--cinema-ink-soft)] ${
            wedding.hero.script ? "mt-5" : ""
          }`}
          style={{ animationDelay: "400ms" }}
        >
          {wedding.tagline}
        </p>

        <h1
          className="cinema-title mt-4 font-script text-6xl leading-[1.15] text-[color:var(--cinema-ink)] sm:text-8xl lg:text-[8.5rem]"
          style={{ animationDelay: "150ms" }}
        >
          {wedding.hero.headline}
        </h1>

        <div
          className="mt-8 flex items-center gap-5"
          style={{ color: "var(--cinema-ink-soft)" }}
        >
          <span
            className="cinema-rule hidden h-px w-12 bg-[color:var(--cinema-rule)] sm:block sm:w-16"
            style={{ animationDelay: "900ms" }}
          />
          <p
            className="cinema-fade text-xs tracking-[0.24em] uppercase sm:text-sm"
            style={{ animationDelay: "1000ms" }}
          >
            {wedding.hero.subhead}
          </p>
          <span
            className="cinema-rule hidden h-px w-12 bg-[color:var(--cinema-rule)] sm:block sm:w-16"
            style={{ animationDelay: "900ms" }}
          />
        </div>

        <p
          className="cinema-fade mx-auto mt-9 max-w-xl leading-relaxed text-[color:var(--cinema-ink-soft)]"
          style={{ animationDelay: "1200ms" }}
        >
          {wedding.hero.invitation}
        </p>

        <div
          className="cinema-fade mt-12 text-[color:var(--cinema-ink)]"
          style={{ animationDelay: "1400ms" }}
        >
          <Countdown date={wedding.weddingDate} tone="light" />
        </div>

        <div
          className="cinema-fade mt-12 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "1600ms" }}
        >
          <Link href="/rsvp" className="btn btn-cinema">
            RSVP
          </Link>
          <AddToCalendar
            events={[ceremony]}
            calendarName={`${wedding.siteName} — ${formatDate(wedding.weddingDate)}`}
            label="Save the date"
            className="btn btn-cinema-ghost"
          />
        </div>
      </div>

      {/*
        Scroll cue ------------------------------------------------------
        The frame ends on a hard cut into the paper page rather than a fade —
        a gradient between near-black and ivory reads as fog, a cut reads as
        an edit.
      */}
      <div
        aria-hidden
        className="cinema-fade absolute inset-x-0 bottom-10 flex justify-center"
        style={{ animationDelay: "2000ms" }}
      >
        <span className="cinema-cue block h-10 w-px bg-[color:var(--cinema-cue)]" />
      </div>
    </section>
  );
}
