import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

export default function Registry() {
  const { registry } = wedding;
  if (registry.items.length === 0) return null;

  return (
    <Section id="gifts" eyebrow="If you insist" heading={registry.heading} intro={registry.intro}>
      <ul className="grid gap-5 md:grid-cols-3">
        {registry.items.map((item, i) => (
          <Reveal as="li" key={item.name} delay={i * 90}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="card group flex h-full flex-col p-7 transition-colors hover:border-bloom"
            >
              <h3 className="font-display text-2xl">{item.name}</h3>
              <p className="mt-3 flex-1 text-ink-soft leading-relaxed">
                {item.description}
              </p>
              <span className="eyebrow mt-6 text-bloom transition-transform group-hover:translate-x-1">
                Open ↗
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
