import type { ReactNode } from "react";
import Reveal from "./Reveal";

/** Shared section shell: consistent rhythm, eyebrow, heading and optional intro. */
export default function Section({
  id,
  eyebrow,
  heading,
  intro,
  children,
  tone = "paper",
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  heading?: string;
  intro?: string;
  children: ReactNode;
  tone?: "paper" | "sunk";
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`${tone === "sunk" ? "bg-paper-sunk" : ""} py-20 sm:py-28 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5">
        {(eyebrow || heading || intro) && (
          <Reveal className="text-center mb-14 sm:mb-16">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            {heading && (
              <h2 className="font-display text-4xl sm:text-5xl">{heading}</h2>
            )}
            {intro && (
              <p className="mx-auto mt-5 max-w-2xl text-ink-soft leading-relaxed">
                {intro}
              </p>
            )}
            <div className="diamond mt-8" />
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
