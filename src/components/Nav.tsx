"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "/#story", label: "Our story" },
  { href: "/#schedule", label: "Schedule" },
  { href: "/#travel", label: "Travel & stay" },
  { href: "/#party", label: "Wedding party" },
  { href: "/#gifts", label: "Gifts" },
  { href: "/#photos", label: "Photos" },
  { href: "/#faq", label: "FAQ" },
];

export default function Nav({
  title,
  overHero = false,
}: {
  title: string;
  /** Set on pages that open with the dark cinematic frame behind the header. */
  overHero?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Light type only while the header actually sits on the dark frame.
  const onFrame = overHero && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on Escape, and stop the page scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || open
          ? "bg-paper/95 backdrop-blur border-b border-line"
          : "bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"
        aria-label="Main"
      >
        <Link
          href="/"
          className={`font-display text-lg tracking-wide transition-colors ${
            onFrame ? "text-[color:var(--cinema-ink)]" : ""
          }`}
          onClick={() => setOpen(false)}
        >
          {title}
        </Link>

        <ul className="hidden lg:flex items-center gap-7">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-[0.8125rem] transition-colors ${
                  onFrame
                    ? "text-[color:var(--cinema-ink-soft)] hover:text-[color:var(--cinema-gold)]"
                    : "text-ink-soft hover:text-olive"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/rsvp"
              className={
                onFrame
                  ? "btn !py-2.5 !px-5 border-[color:var(--cinema-line)] text-[color:var(--cinema-ink)] hover:border-[color:var(--cinema-gold)] hover:text-[color:var(--cinema-gold)]"
                  : "btn btn-primary !py-2.5 !px-5"
              }
            >
              RSVP
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-3 lg:hidden">
          <Link
            href="/rsvp"
            className={
              onFrame
                ? "btn !py-2 !px-4 text-[0.6875rem] border-[color:var(--cinema-line)] text-[color:var(--cinema-ink)]"
                : "btn btn-primary !py-2 !px-4 text-[0.6875rem]"
            }
          >
            RSVP
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="p-2 -mr-2"
          >
            <span className="block w-6 space-y-[5px]">
              <span
                className={`block h-px ${
                  onFrame ? "bg-[color:var(--cinema-ink)]" : "bg-ink"
                } transition-transform duration-300 ${
                  open ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-px ${
                  onFrame ? "bg-[color:var(--cinema-ink)]" : "bg-ink"
                } transition-opacity duration-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-px ${
                  onFrame ? "bg-[color:var(--cinema-ink)]" : "bg-ink"
                } transition-transform duration-300 ${
                  open ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Fills the rest of the viewport so the page beneath doesn't show through. */}
      {open && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-line bg-paper min-h-[calc(100dvh-4.25rem)]"
        >
          <ul className="mx-auto max-w-6xl px-5 py-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-display text-2xl text-ink hover:text-olive transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
