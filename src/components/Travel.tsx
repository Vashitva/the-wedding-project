import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

export default function Travel() {
  const { travel } = wedding;

  return (
    <Section
      id="travel"
      eyebrow="Logistics"
      heading={travel.heading}
      intro={travel.intro}
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <h3 className="eyebrow mb-6">Getting here</h3>
          <dl className="space-y-6">
            {travel.directions.map((d) => (
              <div key={d.mode} className="border-l border-line pl-5">
                <dt className="font-display text-xl">{d.mode}</dt>
                <dd className="mt-1.5 text-ink-soft leading-relaxed">{d.detail}</dd>
              </div>
            ))}
          </dl>

          {travel.shuttle && (
            <div className="card mt-8 p-5">
              <p className="eyebrow mb-2 text-gold">Shuttle</p>
              <p className="text-ink-soft leading-relaxed">{travel.shuttle}</p>
            </div>
          )}
        </Reveal>

        <Reveal delay={120}>
          <h3 className="eyebrow mb-6">Where to stay</h3>
          <ul className="space-y-4">
            {travel.hotels.map((hotel) => (
              <li key={hotel.name} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-display text-xl">{hotel.name}</h4>
                  {hotel.priceHint && (
                    <span className="text-sm text-ink-faint">{hotel.priceHint}</span>
                  )}
                </div>

                <p className="mt-2 text-ink-soft leading-relaxed">{hotel.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="text-ink-faint">{hotel.distance}</span>
                  {hotel.bookingUrl && (
                    <a
                      href={hotel.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-olive underline decoration-line underline-offset-4 hover:decoration-olive"
                    >
                      Book a room
                    </a>
                  )}
                  {hotel.phone && (
                    <a href={`tel:${hotel.phone.replace(/\s/g, "")}`} className="text-ink-faint hover:text-olive">
                      {hotel.phone}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
