import { wedding } from "@config/wedding";
import type { Party, Rsvp, RsvpStats } from "./types";

export function buildStats(parties: Party[], rsvps: Rsvp[]): RsvpStats {
  const byParty = new Map(rsvps.map((r) => [r.partyId, r]));

  const guestsInvited = parties.reduce((n, p) => n + p.members.length, 0);

  let attending = 0;
  let declined = 0;

  const perEvent = new Map<string, number>();
  const perMeal = new Map<string, number>();
  const dietaryNotes: { name: string; note: string }[] = [];
  const songRequests: string[] = [];

  for (const rsvp of rsvps) {
    for (const r of rsvp.responses) {
      if (r.attending) {
        attending += 1;
        for (const eventId of r.events) {
          perEvent.set(eventId, (perEvent.get(eventId) ?? 0) + 1);
        }
        if (r.mealId) perMeal.set(r.mealId, (perMeal.get(r.mealId) ?? 0) + 1);
      } else {
        declined += 1;
      }
      if (r.dietary?.trim()) {
        dietaryNotes.push({ name: r.name, note: r.dietary.trim() });
      }
    }

    for (const plus of rsvp.plusOnes) {
      attending += 1;
      if (plus.mealId) perMeal.set(plus.mealId, (perMeal.get(plus.mealId) ?? 0) + 1);
      if (plus.dietary?.trim()) {
        dietaryNotes.push({ name: plus.name, note: plus.dietary.trim() });
      }
      // A plus-one attends every event their host party was invited to.
      const host = parties.find((p) => p.id === rsvp.partyId);
      for (const eventId of host?.events ?? []) {
        perEvent.set(eventId, (perEvent.get(eventId) ?? 0) + 1);
      }
    }

    if (rsvp.songRequest?.trim()) songRequests.push(rsvp.songRequest.trim());
  }

  // Guests on invitations that never came back.
  const awaiting = parties
    .filter((p) => !byParty.has(p.id))
    .reduce((n, p) => n + p.members.length, 0);

  return {
    partiesInvited: parties.length,
    partiesResponded: rsvps.length,
    guestsInvited,
    attending,
    declined,
    awaiting,
    perEvent: wedding.events.map((e) => ({
      eventId: e.id,
      name: e.name,
      attending: perEvent.get(e.id) ?? 0,
    })),
    perMeal: wedding.meals.map((m) => ({
      mealId: m.id,
      name: m.name,
      count: perMeal.get(m.id) ?? 0,
    })),
    dietaryNotes,
    songRequests,
  };
}

/** RFC 4180 CSV of every response, one row per person. */
export function toCsv(parties: Party[], rsvps: Rsvp[]): string {
  const mealName = (id?: string) =>
    wedding.meals.find((m) => m.id === id)?.name ?? "";

  const eventNames = (ids: string[]) =>
    ids.map((id) => wedding.events.find((e) => e.id === id)?.name ?? id).join(" | ");

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const header = [
    "Party",
    "Guest",
    "Type",
    "Attending",
    "Events",
    "Meal",
    "Dietary",
    "Email",
    "Phone",
    "Song request",
    "Note",
    "Updated",
  ];

  const rows: string[][] = [];

  for (const rsvp of rsvps) {
    for (const r of rsvp.responses) {
      rows.push([
        rsvp.partyName,
        r.name,
        "guest",
        r.attending ? "yes" : "no",
        eventNames(r.events),
        mealName(r.mealId),
        r.dietary ?? "",
        rsvp.email,
        rsvp.phone ?? "",
        rsvp.songRequest ?? "",
        rsvp.note ?? "",
        rsvp.updatedAt,
      ]);
    }
    for (const p of rsvp.plusOnes) {
      rows.push([
        rsvp.partyName,
        p.name,
        "plus one",
        "yes",
        "",
        mealName(p.mealId),
        p.dietary ?? "",
        rsvp.email,
        rsvp.phone ?? "",
        "",
        "",
        rsvp.updatedAt,
      ]);
    }
  }

  // Invitations we are still waiting on, so the export is the whole picture.
  const responded = new Set(rsvps.map((r) => r.partyId));
  for (const party of parties.filter((p) => !responded.has(p.id))) {
    for (const m of party.members) {
      rows.push([
        party.displayName,
        `${m.firstName} ${m.lastName}`,
        "guest",
        "awaiting",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}
