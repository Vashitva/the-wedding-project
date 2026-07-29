import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isProviderId, type ProviderId } from "./concierge/provider";

/**
 * Settings the couple can change from the dashboard without a redeploy.
 *
 * Same storage approach as the RSVPs — one small JSON file, written via
 * temp-then-rename so a crash can't truncate it. It holds preferences only,
 * never secrets: API keys stay in the environment, where a file on disk
 * cannot leak them.
 *
 * This file is deliberately *not* the durable place to configure a
 * deployment. It survives restarts but not an ephemeral filesystem, which is
 * exactly why `CONCIERGE_PROVIDER` exists as well and why the dashboard says
 * which of the two is actually in force.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "settings.json");

export type Settings = {
  /** null means "no opinion" — fall through to the environment. */
  conciergeProvider: ProviderId | null;
};

const DEFAULTS: Settings = { conciergeProvider: null };

let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      // Narrowed rather than cast: a hand-edited file should degrade to the
      // default, not put an unknown provider id into the resolver.
      conciergeProvider: isProviderId(parsed.conciergeProvider)
        ? parsed.conciergeProvider
        : null,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULTS };
    // A corrupt settings file must not take the site down.
    console.error("[settings] unreadable, using defaults", err);
    return { ...DEFAULTS };
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return enqueue(async () => {
    const next: Settings = { ...(await loadSettings()), ...patch };
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = path.join(DATA_DIR, `.settings.${randomUUID()}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    return next;
  });
}
