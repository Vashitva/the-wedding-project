import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { wedding } from "@config/wedding";
import { formatDayAndMonth, formatTimeRange, mapsUrl } from "@/lib/format";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Ornament from "@/components/Ornament";
import Reveal from "@/components/Reveal";
import EventAnimation from "@/components/EventAnimation";
import RingDrop from "@/components/RingDrop";
import HaldiSmear from "@/components/HaldiSmear";
import AddToCalendar from "@/components/AddToCalendar";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return wedding.events.map((event) => ({ slug: event.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = wedding.events.find((e) => e.id === slug);
  if (!event) return { title: "Not found" };

  return {
    title: event.name,
    description: `${event.name} — ${formatDayAndMonth(event.start)}, ${formatTimeRange(
      event.start,
      event.end,
    )} at ${event.venue}.`,
  };
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const index = wedding.events.findIndex((e) => e.id === slug);
  if (index === -1) notFound();

  const event = wedding.events[index];
  const previous = wedding.events[index - 1];
  const next = wedding.events[index + 1];

  return (
    <>
      <Nav title={wedding.siteName} />

      <main id="main">
        {/* The frame ---------------------------------------------------- */}
        <section
          className="relative flex min-h-[78svh] items-end overflow-hidden pt-32 pb-16"
          style={{ backgroundColor: event.palette.bg, color: event.palette.ink }}
        >
          <div aria-hidden className="absolute inset-0">
            <EventAnimation animation={event.animation} />
          </div>

          {/*
            The ring ceremony gets the pair of rings dropped over the ambient
            motes — rigid bodies rather than a particle field, so they live in
            their own layer.
          */}
          {event.animation === "rings" && (
            <div aria-hidden className="absolute inset-0">
              <RingDrop />
            </div>
          )}

          {/*
            The haldi gets the other half of the ritual: the powder is in the
            ambient layer, the paste going on is here.
          */}
          {event.animation === "haldi" && (
            <div aria-hidden className="absolute inset-0">
              <HaldiSmear />
            </div>
          )}

          {/* Keeps the type readable wherever the particles happen to gather. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${event.palette.bg} 2%, ${event.palette.bg}e6 16%, ${event.palette.bg}00 58%)`,
            }}
          />

          <div className="relative mx-auto w-full max-w-4xl px-5">
            <p className="eyebrow" style={{ color: event.palette.accent }}>
              {formatDayAndMonth(event.start)} ·{" "}
              {formatTimeRange(event.start, event.end)}
            </p>

            <h1 className="mt-4 font-script text-6xl leading-[1.1] sm:text-8xl">
              {event.name}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-80">
              {event.description}
            </p>
          </div>
        </section>

        {/* The detail --------------------------------------------------- */}
        <section className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
            <Reveal>
              {event.detail.map((paragraph) => (
                <p key={paragraph} className="mb-5 leading-relaxed text-ink-soft last:mb-0">
                  {paragraph}
                </p>
              ))}
            </Reveal>

            <Reveal delay={100}>
              <dl className="card divide-y divide-line text-sm">
                <div className="px-5 py-4">
                  <dt className="eyebrow mb-1.5">Where</dt>
                  <dd>
                    <a
                      href={mapsUrl(event.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-bloom underline decoration-line underline-offset-4 hover:decoration-bloom"
                    >
                      {event.venue}
                    </a>
                    <span className="block text-ink-faint">{event.address}</span>
                  </dd>
                </div>

                <div className="px-5 py-4">
                  <dt className="eyebrow mb-1.5">When</dt>
                  <dd className="text-ink-soft">
                    {formatDayAndMonth(event.start)}
                    <span className="block tabular-nums">
                      {formatTimeRange(event.start, event.end)}
                    </span>
                  </dd>
                </div>

                {event.dressCode && (
                  <div className="px-5 py-4">
                    <dt className="eyebrow mb-1.5">Wear</dt>
                    <dd className="text-ink-soft">{event.dressCode}</dd>
                  </div>
                )}

                <div className="px-5 py-4">
                  <AddToCalendar
                    events={[event]}
                    calendarName={`${event.name} — ${wedding.siteName}`}
                    label="Add to calendar"
                    className="btn btn-ghost w-full"
                  />
                </div>
              </dl>
            </Reveal>
          </div>

          {event.notes && event.notes.length > 0 && (
            <>
              <Ornament className="my-14" />
              <Reveal>
                <dl className="grid gap-6 sm:grid-cols-2">
                  {event.notes.map((note) => (
                    <div key={note.label} className="border-l border-line pl-5">
                      <dt className="font-display text-xl">{note.label}</dt>
                      <dd className="mt-2 leading-relaxed text-ink-soft">{note.body}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </>
          )}
        </section>

        {/* Moving on ---------------------------------------------------- */}
        <nav
          aria-label="Other functions"
          className="border-t border-line bg-paper-sunk"
        >
          <div className="mx-auto grid max-w-4xl gap-px px-5 py-10 sm:grid-cols-2">
            {previous ? (
              <Link href={`/events/${previous.id}`} className="group py-3">
                <p className="eyebrow mb-2">Before this</p>
                <p className="font-display text-2xl transition-colors group-hover:text-bloom">
                  ← {previous.name}
                </p>
              </Link>
            ) : (
              <span />
            )}

            {next && (
              <Link href={`/events/${next.id}`} className="group py-3 sm:text-right">
                <p className="eyebrow mb-2">And then</p>
                <p className="font-display text-2xl transition-colors group-hover:text-bloom">
                  {next.name} →
                </p>
              </Link>
            )}
          </div>

          <div className="mx-auto max-w-4xl px-5 pb-12 text-center">
            <Link href="/rsvp" className="btn btn-primary">
              RSVP
            </Link>
            <p className="mt-4 text-sm text-ink-faint">
              <Link href="/#schedule" className="hover:text-bloom">
                All four functions
              </Link>
            </p>
          </div>
        </nav>
      </main>

      <Footer />
    </>
  );
}
