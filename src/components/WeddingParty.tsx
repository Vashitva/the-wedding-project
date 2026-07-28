import { wedding } from "@config/wedding";
import Section from "./Section";
import Reveal from "./Reveal";

/** Two initials, e.g. "Neha Desai" → "ND". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WeddingParty() {
  if (wedding.weddingParty.length === 0) return null;

  return (
    <Section
      id="party"
      tone="sunk"
      eyebrow="On our side"
      heading="The wedding party"
      intro="The people who got us here, and who will be holding things together on the day."
    >
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {wedding.weddingParty.map((person, i) => (
          <Reveal as="li" key={person.name} delay={i * 70} className="text-center">
            <div
              aria-hidden
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-line bg-paper-raised font-display text-2xl text-bloom"
            >
              {initials(person.name)}
            </div>
            <h3 className="mt-5 font-display text-xl">{person.name}</h3>
            <p className="eyebrow mt-2">{person.role}</p>
            {person.bio && (
              <p className="mt-3 text-sm text-ink-soft leading-relaxed">{person.bio}</p>
            )}
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
