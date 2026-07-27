import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

export default function Story() {
  return (
    <Section id="story" eyebrow="Us" heading={wedding.story.heading}>
      <ol className="mx-auto max-w-2xl">
        {wedding.story.beats.map((beat, i) => (
          <Reveal as="li" key={beat.title} delay={i * 90} className="relative pl-8 pb-12 last:pb-0">
            {/* Timeline spine — hidden on the final beat so it doesn't dangle. */}
            {i < wedding.story.beats.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[3px] top-3 bottom-0 w-px bg-line"
              />
            )}
            <span
              aria-hidden
              className="absolute left-0 top-2 block h-[7px] w-[7px] rotate-45 border border-gold bg-paper"
            />

            <p className="eyebrow">{beat.date}</p>
            <h3 className="mt-2 font-display text-2xl">{beat.title}</h3>
            <p className="mt-3 text-ink-soft leading-relaxed">{beat.body}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
