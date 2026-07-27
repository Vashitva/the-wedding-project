import Link from "next/link";
import { wedding, coupleNames } from "@config/wedding";
import { formatDate } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="border-t border-line py-14">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <p className="font-display text-3xl">{coupleNames}</p>
        <p className="mt-3 text-sm text-ink-faint">
          {formatDate(wedding.weddingDate)} · {wedding.location.city},{" "}
          {wedding.location.region}
        </p>

        <div className="diamond my-8" />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/rsvp" className="text-olive hover:text-ink transition-colors">
            RSVP
          </Link>
          <a
            href={`mailto:${wedding.contact.email}`}
            className="text-ink-soft hover:text-olive transition-colors"
          >
            {wedding.contact.email}
          </a>
          {wedding.contact.phone && (
            <a
              href={`tel:${wedding.contact.phone.replace(/\s/g, "")}`}
              className="text-ink-soft hover:text-olive transition-colors"
            >
              {wedding.contact.phone}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
