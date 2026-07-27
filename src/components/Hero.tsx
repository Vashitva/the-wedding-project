import Link from "next/link";
import { wedding } from "@config/wedding";
import { formatDate } from "@/lib/format";
import Countdown from "./Countdown";
import AddToCalendar from "./AddToCalendar";

export default function Hero() {
  const ceremony = wedding.events.find((e) => e.id === "ceremony") ?? wedding.events[0];

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pt-24 pb-16 text-center">
      {/* Soft radial wash behind the type; sits under everything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, color-mix(in srgb, var(--color-blush) 26%, transparent), transparent 70%)",
        }}
      />

      {wedding.hero.image && (
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${wedding.hero.image})` }}
        />
      )}

      <p className="eyebrow fade-up">{wedding.tagline}</p>

      <h1
        className="fade-up mt-6 font-display text-6xl leading-[0.95] sm:text-8xl"
        style={{ animationDelay: "120ms" }}
      >
        {wedding.hero.headline}
      </h1>

      <div
        className="fade-up mt-8 flex items-center gap-4"
        style={{ animationDelay: "220ms" }}
      >
        <span className="h-px w-10 bg-gold/60" />
        <p className="text-sm tracking-[0.14em] uppercase text-ink-soft">
          {wedding.hero.subhead}
        </p>
        <span className="h-px w-10 bg-gold/60" />
      </div>

      <p
        className="fade-up mx-auto mt-8 max-w-xl text-ink-soft leading-relaxed"
        style={{ animationDelay: "320ms" }}
      >
        {wedding.hero.invitation}
      </p>

      <div className="fade-up mt-12" style={{ animationDelay: "420ms" }}>
        <Countdown date={wedding.weddingDate} />
      </div>

      <div
        className="fade-up mt-12 flex flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: "520ms" }}
      >
        <Link href="/rsvp" className="btn btn-primary">
          RSVP
        </Link>
        <AddToCalendar
          events={[ceremony]}
          calendarName={`${wedding.siteName} — ${formatDate(wedding.weddingDate)}`}
          label="Save the date"
        />
      </div>
    </section>
  );
}
