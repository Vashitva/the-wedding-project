import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

export default function Faq() {
  if (wedding.faq.length === 0) return null;

  return (
    <Section
      id="faq"
      tone="sunk"
      eyebrow="Details"
      heading="Questions, answered"
      intro={`Anything else, email us at ${wedding.contact.email} — we read everything, eventually.`}
    >
      <div className="mx-auto max-w-2xl divide-y divide-line border-y border-line">
        {wedding.faq.map((item, i) => (
          <Reveal key={item.question} delay={i * 50}>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                <span className="font-display text-xl leading-snug">{item.question}</span>
                <span
                  aria-hidden
                  className="mt-1.5 shrink-0 text-gold transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-10 text-ink-soft leading-relaxed">{item.answer}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
