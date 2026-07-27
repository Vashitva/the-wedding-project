import { NextResponse } from "next/server";
import { searchParties } from "@/lib/guests";
import { getRsvp } from "@/lib/store";
import { issuePartyToken } from "@/lib/party-token";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rsvpIsOpen } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "lookup"), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many lookups. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const query = (body as { query?: unknown })?.query;
  if (typeof query !== "string" || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Please enter a full name or your invitation code." },
      { status: 400 },
    );
  }

  let matches = await searchParties(query);

  // Disambiguation round-trip: the guest picked one of the options we offered,
  // and we re-run the search so the choice still has to be backed by a match.
  const chosenId = (body as { partyId?: unknown })?.partyId;
  if (typeof chosenId === "string" && chosenId) {
    matches = matches.filter((m) => m.party.id === chosenId);
  }

  if (matches.length === 0) {
    return NextResponse.json(
      {
        error:
          "We couldn't find that invitation. Try the full name as it appears on the envelope, or the code printed on your card.",
      },
      { status: 404 },
    );
  }

  // Several households share a surname — let the guest say which is theirs,
  // without revealing anything beyond the name already on the invitation.
  if (matches.length > 1) {
    return NextResponse.json({
      ambiguous: true,
      options: matches.map((m) => ({ id: m.party.id, displayName: m.party.displayName })),
    });
  }

  const party = matches[0].party;
  const existing = await getRsvp(party.id);

  return NextResponse.json({
    party,
    existing,
    token: issuePartyToken(party.id),
    open: rsvpIsOpen(),
  });
}
