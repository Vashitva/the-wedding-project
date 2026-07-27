import type { Metadata } from "next";
import { wedding } from "@config/wedding";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import RsvpFlow from "@/components/RsvpFlow";
import { rsvpIsOpen } from "@/lib/validate";

export const metadata: Metadata = {
  title: "RSVP",
  description: `Reply to ${wedding.siteName}'s invitation.`,
};

// The deadline is evaluated per request rather than baked in at build time.
export const dynamic = "force-dynamic";

export default function RsvpPage() {
  return (
    <>
      <Nav title={wedding.siteName} />
      <main id="main" className="px-5 pt-32 pb-24 sm:pt-40">
        <RsvpFlow open={rsvpIsOpen()} />
      </main>
      <Footer />
    </>
  );
}
