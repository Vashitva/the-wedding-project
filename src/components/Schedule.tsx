import { wedding } from "@config/wedding";
import { formatTimeRange, groupEventsByDay, mapsUrl } from "@/lib/format";
import Section from "./Section";
import Reveal from "./Reveal";
import AddToCalendar from "./AddToCalendar";

export default function Schedule() {
  const days = groupEventsByDay(wedding.events);

  return (
    <Section
      id="schedule"
      tone="sunk"
      eyebrow="The weekend"
      heading="Schedule"
      intro="Everything happens within ten minutes of the village. Events marked “by invitation” are on your card if they're yours."
    >
      <div className="mx-auto max-w-3xl space-y-14">
        {days.map((day, dayIndex) => (
          <Reveal key={day.key} delay={dayIndex * 80}>
            <h3 className="font-display text-2xl text-olive">{day.label}</h3>
            <div className="rule mt-4 mb-8" />

            <ol className="space-y-8">
              {day.events.map((event) => (
                <li key={event.id} className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                  <div className="text-sm text-ink-faint tabular-nums sm:text-right sm:pt-1">
                    {formatTimeRange(event.start, event.end)}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h4 className="font-display text-2xl">{event.name}</h4>
                      {event.optional && (
                        <span className="eyebrow !text-[0.625rem] text-gold">
                          By invitation
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-ink-soft leading-relaxed">
                      {event.description}
                    </p>

                    <dl className="mt-4 space-y-1 text-sm">
                      <div className="flex gap-2">
                        <dt className="sr-only">Venue</dt>
                        <dd>
                          <a
                            href={mapsUrl(event.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-olive underline decoration-line underline-offset-4 hover:decoration-olive"
                          >
                            {event.venue}
                          </a>
                          <span className="text-ink-faint"> · {event.address}</span>
                        </dd>
                      </div>
                      {event.dressCode && (
                        <div className="flex gap-2 text-ink-faint">
                          <dt>Dress:</dt>
                          <dd>{event.dressCode}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        ))}

        <Reveal className="pt-4 text-center">
          <AddToCalendar
            events={[...wedding.events]}
            calendarName={`${wedding.siteName} weekend`}
            label="Add the whole weekend"
          />
        </Reveal>
      </div>
    </Section>
  );
}
