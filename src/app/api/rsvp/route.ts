import { NextResponse } from "next/server";
import { findPartyById } from "@/lib/guests";
import { saveRsvp } from "@/lib/store";
import { verifyPartyToken } from "@/lib/party-token";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { ValidationError, rsvpIsOpen, validateSubmission } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "rsvp"), { limit: 12, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!rsvpIsOpen()) {
    return NextResponse.json(
      {
        error:
          "RSVPs have closed. Please email us directly and we will do our best to sort it out.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const partyId = verifyPartyToken((body as { token?: unknown })?.token);
  if (!partyId) {
    return NextResponse.json(
      { error: "Your session expired. Please look up your invitation again." },
      { status: 401 },
    );
  }

  const party = await findPartyById(partyId);
  if (!party) {
    return NextResponse.json({ error: "We couldn't find that invitation." }, { status: 404 });
  }

  try {
    const validated = validateSubmission(party, body);
    const saved = await saveRsvp({
      partyId: party.id,
      partyName: party.displayName,
      ...validated,
    });
    return NextResponse.json({ ok: true, rsvp: saved });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to save RSVP", err);
    return NextResponse.json(
      { error: "Something went wrong saving your reply. Please try again." },
      { status: 500 },
    );
  }
}
