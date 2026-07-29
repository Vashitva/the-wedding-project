import Link from "next/link";
import { wedding } from "@config/wedding";
import { formatDate } from "@/lib/format";
import { rsvpIsOpen } from "@/lib/validate";
import Reveal from "./Reveal";

/** Closing call to action, with the deadline stated plainly. */
export default function RsvpBanner() {
  const open = rsvpIsOpen();
  const deadline = formatDate(wedding.rsvpDeadline);

  return (
    <section className="py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl px-5 text-center">
        <p className="eyebrow mb-4">{open ? "Please reply by" : "RSVPs are closed"}</p>
        <h2 className="font-display text-4xl sm:text-5xl">
          {open ? deadline : "Thank you"}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-ink-soft leading-relaxed">
          {open
            ? "Look yourself up with the name on your invitation, or the code printed on the card."
            : `We've closed replies to get final numbers to the caterers. If something has changed, email us at ${wedding.contact.email}.`}
        </p>
        <div className="mt-9">
          <Link href="/rsvp" className={open ? "btn btn-primary" : "btn btn-ghost"}>
            {open ? "RSVP now" : "View your reply"}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
