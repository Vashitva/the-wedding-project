import { promises as fs } from "node:fs";
import path from "node:path";
import type { Party } from "./types";

const GUEST_FILE = path.join(process.cwd(), "data", "guests.json");

let cache: { parties: Party[]; mtimeMs: number } | null = null;

/**
 * Reads the invitation list, re-reading only when the file changes on disk so
 * you can edit data/guests.json without restarting the server.
 */
export async function loadParties(): Promise<Party[]> {
  const stat = await fs.stat(GUEST_FILE);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.parties;

  const raw = await fs.readFile(GUEST_FILE, "utf8");
  const parsed = JSON.parse(raw) as Party[];
  if (!Array.isArray(parsed)) {
    throw new Error("data/guests.json must contain an array of parties");
  }
  cache = { parties: parsed, mtimeMs: stat.mtimeMs };
  return parsed;
}

export async function findPartyById(id: string): Promise<Party | null> {
  const parties = await loadParties();
  return parties.find((p) => p.id === id) ?? null;
}

/** Lowercase, strip accents and punctuation so "Renée O'Hara" matches "renee ohara". */
export function normalise(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type PartyMatch = { party: Party; score: number };

/**
 * Finds invitations matching a guest's search.
 *
 * Deliberately conservative: a bare first name only matches when it is unique
 * across the whole list, so the lookup box can't be used to page through the
 * guest list one common name at a time.
 */
export async function searchParties(query: string): Promise<PartyMatch[]> {
  const q = normalise(query);
  if (q.length < 2) return [];

  const parties = await loadParties();
  const tokens = q.split(" ").filter(Boolean);
  const matches: PartyMatch[] = [];

  for (const party of parties) {
    // An invitation code is an exact, unambiguous match.
    if (normalise(party.code) === q) {
      matches.push({ party, score: 100 });
      continue;
    }

    let best = 0;
    for (const m of party.members) {
      const first = normalise(m.firstName);
      const last = normalise(m.lastName);
      const full = `${first} ${last}`;

      if (full === q) {
        best = Math.max(best, 90);
      } else if (tokens.length > 1 && tokens.every((t) => full.includes(t))) {
        best = Math.max(best, 70);
      } else if (tokens.length === 1 && last === q) {
        best = Math.max(best, 50);
      } else if (tokens.length === 1 && first === q) {
        // Only useful if unique — filtered below.
        best = Math.max(best, 20);
      }
    }

    if (normalise(party.displayName).includes(q) && q.length >= 4) {
      best = Math.max(best, 60);
    }

    if (best > 0) matches.push({ party, score: best });
  }

  matches.sort((a, b) => b.score - a.score);

  // A weak first-name-only hit is only returned when nothing stronger matched
  // and it is the single candidate.
  const strong = matches.filter((m) => m.score > 20);
  if (strong.length > 0) return strong;
  return matches.length === 1 ? matches : [];
}

/** Total head-count on the invitation list, used by the admin dashboard. */
export async function guestCount(): Promise<{ parties: number; people: number }> {
  const parties = await loadParties();
  return {
    parties: parties.length,
    people: parties.reduce((n, p) => n + p.members.length, 0),
  };
}
