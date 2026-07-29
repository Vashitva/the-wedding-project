import type { Metadata } from "next";
import Link from "next/link";
import { wedding } from "@config/wedding";
import { adminPasswordIsConfigured, isAdmin } from "@/lib/auth";
import { loadParties } from "@/lib/guests";
import { listRsvps } from "@/lib/store";
import { buildStats } from "@/lib/stats";
import { loadSettings } from "@/lib/settings";
import {
  PROVIDER_IDS,
  apiKeyFor,
  modelFor,
  resolveProvider,
  type ProviderId,
} from "@/lib/concierge/provider";
import AdminLogin from "@/components/AdminLogin";
import ConciergeSettings from "@/components/ConciergeSettings";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Replies", robots: { index: false } };
export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-4xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main id="main" className="px-5 py-32">
        <AdminLogin configured={adminPasswordIsConfigured()} />
      </main>
    );
  }

  const [parties, rsvps, settings] = await Promise.all([
    loadParties(),
    listRsvps(),
    loadSettings(),
  ]);

  const resolution = resolveProvider(settings.conciergeProvider);
  const keys = Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, Boolean(apiKeyFor(id))]),
  ) as Record<ProviderId, boolean>;
  const stats = buildStats(parties, rsvps);

  const respondedIds = new Set(rsvps.map((r) => r.partyId));
  const awaiting = parties.filter((p) => !respondedIds.has(p.id));

  const sorted = [...rsvps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main id="main" className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{wedding.siteName}</p>
          <h1 className="font-display text-4xl">Replies</h1>
        </div>
        <div className="flex gap-3">
          <a href="/api/admin/export" className="btn btn-ghost">
            Export CSV
          </a>
          <form action={logout}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="rule my-8" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Attending"
          value={stats.attending}
          hint={`of ${stats.guestsInvited} invited${
            stats.attending > stats.guestsInvited ? " (incl. plus ones)" : ""
          }`}
        />
        <Stat label="Declined" value={stats.declined} />
        <Stat label="Awaiting" value={stats.awaiting} hint={`${awaiting.length} invitations`} />
        <Stat
          label="Responded"
          value={`${stats.partiesResponded}/${stats.partiesInvited}`}
          hint="invitations"
        />
      </div>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl mb-4">Headcount by event</h2>
          <ul className="card divide-y divide-line">
            {stats.perEvent.map((e) => (
              <li key={e.eventId} className="flex justify-between px-5 py-3">
                <span>{e.name}</span>
                <span className="tabular-nums text-bloom">{e.attending}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-2xl mb-4">Kitchen numbers</h2>
          <ul className="card divide-y divide-line">
            {stats.perMeal.map((m) => (
              <li key={m.mealId} className="flex justify-between px-5 py-3">
                <span>{m.name}</span>
                <span className="tabular-nums text-bloom">{m.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {stats.dietaryNotes.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4">Allergies & dietary needs</h2>
          <ul className="card divide-y divide-line">
            {stats.dietaryNotes.map((note, i) => (
              <li key={`${note.name}-${i}`} className="px-5 py-3">
                <span className="font-medium">{note.name}</span>
                <span className="text-ink-soft"> — {note.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl mb-4">
          Every reply <span className="text-ink-faint text-base">({sorted.length})</span>
        </h2>

        {sorted.length === 0 ? (
          <p className="card p-6 text-ink-soft">No replies yet.</p>
        ) : (
          <div className="card divide-y divide-line">
            {sorted.map((rsvp) => (
              <details key={rsvp.partyId} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <span>
                    <span className="font-medium">{rsvp.partyName}</span>
                    <span className="ml-3 text-sm text-ink-faint">
                      {rsvp.responses.filter((r) => r.attending).length + rsvp.plusOnes.length}{" "}
                      coming
                    </span>
                  </span>
                  <span className="text-xs text-ink-faint">
                    {new Date(rsvp.updatedAt).toLocaleString("en-GB", {
                      timeZone: wedding.timeZone,
                    })}
                  </span>
                </summary>

                <div className="px-5 pb-5 text-sm">
                  <ul className="space-y-1.5">
                    {rsvp.responses.map((r) => (
                      <li key={r.guestId} className="flex flex-wrap gap-x-3">
                        <span className={r.attending ? "text-bloom" : "text-ink-faint"}>
                          {r.attending ? "✓" : "✕"}
                        </span>
                        <span>{r.name}</span>
                        {r.attending && (
                          <span className="text-ink-faint">
                            {r.events
                              .map((id) => wedding.events.find((e) => e.id === id)?.name ?? id)
                              .join(", ")}
                            {r.mealId &&
                              ` · ${wedding.meals.find((m) => m.id === r.mealId)?.name ?? r.mealId}`}
                          </span>
                        )}
                        {r.dietary && <span className="text-gold">{r.dietary}</span>}
                      </li>
                    ))}
                    {rsvp.plusOnes.map((p) => (
                      <li key={p.name} className="flex flex-wrap gap-x-3">
                        <span className="text-bloom">✓</span>
                        <span>{p.name}</span>
                        <span className="text-ink-faint">
                          plus one
                          {p.mealId &&
                            ` · ${wedding.meals.find((m) => m.id === p.mealId)?.name ?? p.mealId}`}
                        </span>
                        {p.dietary && <span className="text-gold">{p.dietary}</span>}
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-4 space-y-1 text-ink-soft">
                    <div className="flex gap-2">
                      <dt className="text-ink-faint">Email:</dt>
                      <dd>
                        <a href={`mailto:${rsvp.email}`} className="hover:text-bloom">
                          {rsvp.email}
                        </a>
                      </dd>
                    </div>
                    {rsvp.phone && (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Phone:</dt>
                        <dd>{rsvp.phone}</dd>
                      </div>
                    )}
                    {rsvp.songRequest && (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Song:</dt>
                        <dd>{rsvp.songRequest}</dd>
                      </div>
                    )}
                    {rsvp.note && (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Note:</dt>
                        <dd>{rsvp.note}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {awaiting.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4">
            Still waiting on{" "}
            <span className="text-ink-faint text-base">({awaiting.length})</span>
          </h2>
          <ul className="card divide-y divide-line">
            {awaiting.map((party) => (
              <li key={party.id} className="flex justify-between px-5 py-3">
                <span>{party.displayName}</span>
                <span className="text-sm text-ink-faint">
                  {party.members.length} guest{party.members.length === 1 ? "" : "s"} ·{" "}
                  {party.code}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.songRequests.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4">The playlist</h2>
          <ul className="card divide-y divide-line">
            {stats.songRequests.map((song, i) => (
              <li key={`${song}-${i}`} className="px-5 py-3">
                {song}
              </li>
            ))}
          </ul>
        </section>
      )}

      {wedding.concierge.enabled && (
        <ConciergeSettings
          resolution={resolution}
          chosen={settings.conciergeProvider}
          model={resolution.id ? modelFor(resolution.id) : null}
          keys={keys}
        />
      )}

      <p className="mt-12 text-center text-sm">
        <Link href="/" className="text-ink-faint hover:text-bloom">
          ← Back to the site
        </Link>
      </p>
    </main>
  );
}
