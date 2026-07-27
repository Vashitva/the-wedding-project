import { wedding } from "@config/wedding";
import type { MemberResponse, Party, PlusOneResponse } from "./types";

export type ValidatedSubmission = {
  email: string;
  phone?: string;
  responses: MemberResponse[];
  plusOnes: PlusOneResponse[];
  songRequest?: string;
  note?: string;
};

export class ValidationError extends Error {}

const MAX_TEXT = 500;

function text(value: unknown, field: string, { max = MAX_TEXT, required = false } = {}): string {
  if (value == null || value === "") {
    if (required) throw new ValidationError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required.`);
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be under ${max} characters.`);
  }
  return trimmed;
}

/** Deliberately permissive — just enough to catch a typo, not to police addresses. */
function email(value: unknown): string {
  const raw = text(value, "Email address", { max: 254, required: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new ValidationError("That email address doesn't look right.");
  }
  return raw;
}

export function rsvpIsOpen(now = new Date()): boolean {
  // The deadline is inclusive: RSVPs close at the end of that day.
  const deadline = new Date(`${wedding.rsvpDeadline}T23:59:59`);
  return now <= deadline;
}

const mealIds = new Set(wedding.meals.map((m) => m.id));

/**
 * Checks a submitted RSVP against the invitation it claims to answer:
 * every person must be on the invitation, every event must be one they were
 * invited to, and plus-ones cannot exceed the allowance.
 */
export function validateSubmission(party: Party, body: unknown): ValidatedSubmission {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Malformed request.");
  }
  const input = body as Record<string, unknown>;

  const rawResponses = input.responses;
  if (!Array.isArray(rawResponses) || rawResponses.length === 0) {
    throw new ValidationError("Please answer for at least one guest.");
  }

  const invitedEvents = new Set(party.events);
  const seen = new Set<string>();
  const responses: MemberResponse[] = [];

  for (const entry of rawResponses) {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError("Malformed guest response.");
    }
    const r = entry as Record<string, unknown>;

    const guestId = text(r.guestId, "Guest", { max: 120, required: true });
    const member = party.members.find((m) => m.id === guestId);
    if (!member) throw new ValidationError("That guest is not on this invitation.");
    if (seen.has(guestId)) throw new ValidationError("Duplicate answer for a guest.");
    seen.add(guestId);

    const attending = r.attending === true;

    let events: string[] = [];
    if (attending) {
      const rawEvents = Array.isArray(r.events) ? r.events : [];
      events = rawEvents
        .filter((e): e is string => typeof e === "string")
        .filter((e) => invitedEvents.has(e));
      if (events.length === 0) {
        throw new ValidationError(
          `Please choose at least one event for ${member.firstName}, or mark them as unable to come.`,
        );
      }
    }

    const mealRaw = text(r.mealId, "Meal choice", { max: 60 });
    if (attending && wedding.meals.length > 0) {
      if (!mealRaw) throw new ValidationError(`Please pick a meal for ${member.firstName}.`);
      if (!mealIds.has(mealRaw)) throw new ValidationError("Unknown meal choice.");
    }

    responses.push({
      guestId,
      name: `${member.firstName} ${member.lastName}`,
      attending,
      events,
      mealId: attending && mealRaw ? mealRaw : undefined,
      dietary: text(r.dietary, "Dietary notes") || undefined,
    });
  }

  const allowance = party.plusOnesAllowed ?? 0;
  const rawPlusOnes = Array.isArray(input.plusOnes) ? input.plusOnes : [];
  const plusOnes: PlusOneResponse[] = [];

  for (const entry of rawPlusOnes) {
    if (typeof entry !== "object" || entry === null) continue;
    const p = entry as Record<string, unknown>;
    const name = text(p.name, "Guest name", { max: 120 });
    if (!name) continue; // An empty row just means "not bringing anyone".

    const mealRaw = text(p.mealId, "Meal choice", { max: 60 });
    if (wedding.meals.length > 0) {
      if (!mealRaw) throw new ValidationError(`Please pick a meal for ${name}.`);
      if (!mealIds.has(mealRaw)) throw new ValidationError("Unknown meal choice.");
    }

    plusOnes.push({
      name,
      mealId: mealRaw || undefined,
      dietary: text(p.dietary, "Dietary notes") || undefined,
    });
  }

  if (plusOnes.length > allowance) {
    throw new ValidationError(
      allowance === 0
        ? "This invitation doesn't include an additional guest."
        : `This invitation includes ${allowance} additional guest${allowance === 1 ? "" : "s"}.`,
    );
  }

  // Nobody coming means there is nobody to bring.
  if (plusOnes.length > 0 && !responses.some((r) => r.attending)) {
    throw new ValidationError("An additional guest needs someone to come with.");
  }

  return {
    email: email(input.email),
    phone: text(input.phone, "Phone number", { max: 40 }) || undefined,
    responses,
    plusOnes,
    songRequest: wedding.collectSongRequests
      ? text(input.songRequest, "Song request", { max: 200 }) || undefined
      : undefined,
    note: text(input.note, "Message") || undefined,
  };
}
