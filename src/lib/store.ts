import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Rsvp } from "./types";

/**
 * RSVPs are kept in a single JSON file. That is a deliberate choice for a
 * wedding: a few hundred rows, trivially inspectable, trivially backed up,
 * and no database to keep alive between now and the day.
 *
 * Writes are serialised through an in-process queue and land via
 * write-temp-then-rename, so a crash mid-save can never truncate the file.
 *
 * If you deploy somewhere with an ephemeral or read-only filesystem (Vercel,
 * Lambda), swap the two functions at the bottom of this file for your database
 * of choice — nothing else in the app touches storage.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const RSVP_FILE = path.join(DATA_DIR, "rsvps.json");

/** Serialises all mutations; each write waits for the previous one to settle. */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  // Keep the chain alive even if a caller's task rejects.
  writeChain = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Rsvp[]> {
  try {
    const raw = await fs.readFile(RSVP_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Rsvp[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(rsvps: Rsvp[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, `.rsvps.${randomUUID()}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(rsvps, null, 2), "utf8");
  await fs.rename(tmp, RSVP_FILE);
}

/* ── Public API ──────────────────────────────────────────────────────── */

export async function listRsvps(): Promise<Rsvp[]> {
  return readAll();
}

export async function getRsvp(partyId: string): Promise<Rsvp | null> {
  const all = await readAll();
  return all.find((r) => r.partyId === partyId) ?? null;
}

/**
 * Creates or replaces the RSVP for a party. Guests may change their answer as
 * often as they like until the deadline; `submittedAt` keeps the first time.
 */
export async function saveRsvp(
  rsvp: Omit<Rsvp, "submittedAt" | "updatedAt">,
): Promise<Rsvp> {
  return enqueue(async () => {
    const all = await readAll();
    const now = new Date().toISOString();
    const index = all.findIndex((r) => r.partyId === rsvp.partyId);

    const record: Rsvp = {
      ...rsvp,
      submittedAt: index >= 0 ? all[index].submittedAt : now,
      updatedAt: now,
    };

    if (index >= 0) all[index] = record;
    else all.push(record);

    await writeAll(all);
    return record;
  });
}
