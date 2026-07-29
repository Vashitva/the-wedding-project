"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const ceremony = wedding.events.find((e) => e.id === "shadi") ?? wedding.events[0];

  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  /*
   * A photograph that 404s must not leave a broken frame on the landing, so
   * failures are dropped from the rotation and the hero closes over the gap.
   * With every photograph missing it falls through to the atmosphere wash.
   */
  const [failed, setFailed] = useState<string[]>([]);
  const photos = (media.photos ?? []).filter(
    (photo) => photo.src && !failed.includes(photo.src),
  );
  const markFailed = useCallback((src: string) => {
    setFailed((list) => (list.includes(src) ? list : [...list, src]));
  }, []);

  const [active, setActive] = useState(0);
  // Photographs are loaded a step ahead of the fade rather than all at once:
  // five full-bleed frames is a lot to ask of a phone on venue wifi, and only
  // the first is needed to paint.
  const [reached, setReached] = useState(0);

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
      // The near plane travels furthest — that difference is the depth.
      if (foregroundRef.current) {
        foregroundRef.current.style.transform = `translate3d(0, ${y * -0.22}px, 0) scale(${1 + progress * 0.08})`;
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

  /* The cross-fade. Several photographs behind the type, held and swapped. */
  useEffect(() => {
    if (showVideo || reducedMotion || photos.length < 2) return;

    const hold = Math.max(2, media.hold ?? 7) * 1000;
    let timer = 0;

    const advance = () => {
      setActive((current) => {
        const next = (current + 1) % photos.length;
        setReached((high) => Math.max(high, next + 1));
        return next;
      });
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(advance, hold);
    };
    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    // Nobody is watching a backdrop they have scrolled past, or a hidden tab.
    const onVisibility = () => (document.hidden ? stop() : start());
    const onScroll = () => (window.scrollY > window.innerHeight ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showVideo, reducedMotion, photos.length, media.hold]);

  // Fetch the next one during the current one's hold, so the fade never waits.
  useEffect(() => {
    setReached((high) => Math.max(high, Math.min(photos.length, active + 2)));
  }, [active, photos.length]);

  const poster = media.poster || photos[0]?.src;
  // A photograph failing mid-rotation shortens the list under the cursor.
  const current = photos.length > 0 ? active % photos.length : 0;

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
              poster={poster || undefined}
              autoPlay
              muted
              loop
              playsInline
              // Decorative: the page says everything the clip does.
              aria-hidden
            />
          ) : photos.length > 0 ? (
            /*
              Every photograph is stacked in the same slot and only the active
              one is opaque, so a swap is a genuine dissolve — both frames are
              on screen through the middle of it — rather than a cut.
            */
            photos.map((photo, index) => {
              const shown = reducedMotion ? index === 0 : index === current;
              if (index > reached && !shown) return null;

              return (
                <img
                  key={photo.src}
                  src={photo.src}
                  alt=""
                  aria-hidden
                  // The first frame is the largest thing on the page and the
                  // thing guests are waiting for; the rest can queue behind it.
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  ref={(node) => {
                    /*
                      The markup is server-rendered, so the browser can start —
                      and fail — this request before React hydrates and attaches
                      onError. A failure already on the books has to be read off
                      the element instead of waited for, or a missing photograph
                      sits in the rotation as a blank frame.
                    */
                    if (node?.complete && node.naturalWidth === 0) {
                      markFailed(photo.src);
                    }
                  }}
                  onError={() => markFailed(photo.src)}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out"
                  style={{
                    objectPosition: photo.focalPoint || media.focalPoint,
                    opacity: shown ? 1 : 0,
                  }}
                />
              );
            })
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

      {/* The near plane sits over the grade but under the grain and the type. */}
      {media.foreground && (
        <div
          ref={foregroundRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <img
            src={media.foreground}
            alt=""
            className="h-full w-full scale-110 object-cover"
          />
        </div>
      )}

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
          className="pointer-events-none absolute left-1/2 top-1/2 w-[19rem] max-w-[82vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.22] text-[color:var(--cinema-gold)] sm:w-[34rem] sm:opacity-[0.3] lg:w-[42rem]"
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
