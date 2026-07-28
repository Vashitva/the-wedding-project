"use client";

import { useState } from "react";
import Link from "next/link";
import { wedding } from "@config/wedding";
import { formatDayAndMonth, formatTimeRange } from "@/lib/format";
import type { Party, Rsvp } from "@/lib/types";
import Ornament from "./Ornament";

type Option = { id: string; displayName: string };

type MemberDraft = {
  guestId: string;
  attending: boolean | null;
  events: string[];
  mealId: string;
  dietary: string;
};

type PlusOneDraft = { name: string; mealId: string; dietary: string };

type Stage =
  | { kind: "lookup" }
  | { kind: "choose"; options: Option[] }
  | { kind: "form"; party: Party; token: string; existing: Rsvp | null }
  | { kind: "done"; party: Party; rsvp: Rsvp };

const eventName = (id: string) => wedding.events.find((e) => e.id === id)?.name ?? id;

function draftFrom(party: Party, existing: Rsvp | null): MemberDraft[] {
  return party.members.map((member) => {
    const prior = existing?.responses.find((r) => r.guestId === member.id);
    return {
      guestId: member.id,
      attending: prior ? prior.attending : null,
      // Default to every event on the invitation — most guests come to all of them.
      events: prior?.events ?? [...party.events],
      mealId: prior?.mealId ?? (member.isChild ? "kids" : ""),
      dietary: prior?.dietary ?? "",
    };
  });
}

export default function RsvpFlow({ open }: { open: boolean }) {
  const [stage, setStage] = useState<Stage>({ kind: "lookup" });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [plusOnes, setPlusOnes] = useState<PlusOneDraft[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [songRequest, setSongRequest] = useState("");
  const [note, setNote] = useState("");

  async function lookup(partyId?: string) {
    if (query.trim().length < 2) {
      setError("Please enter a full name or your invitation code.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/rsvp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, partyId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.ambiguous) {
        setStage({ kind: "choose", options: data.options });
        return;
      }

      const party = data.party as Party;
      const existing = (data.existing as Rsvp | null) ?? null;

      setMembers(draftFrom(party, existing));
      setPlusOnes(
        existing?.plusOnes.map((p) => ({
          name: p.name,
          mealId: p.mealId ?? "",
          dietary: p.dietary ?? "",
        })) ?? [],
      );
      setEmail(existing?.email ?? "");
      setPhone(existing?.phone ?? "");
      setSongRequest(existing?.songRequest ?? "");
      setNote(existing?.note ?? "");
      setStage({ kind: "form", party, token: data.token, existing });
    } catch {
      setError("We couldn't reach the server. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (stage.kind !== "form") return;

    if (members.some((m) => m.attending === null)) {
      setError("Please answer for everyone on the invitation.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: stage.token,
          email,
          phone,
          songRequest,
          note,
          responses: members.map((m) => ({
            guestId: m.guestId,
            attending: m.attending === true,
            events: m.events,
            mealId: m.mealId,
            dietary: m.dietary,
          })),
          plusOnes: plusOnes.filter((p) => p.name.trim()),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStage({ kind: "done", party: stage.party, rsvp: data.rsvp });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn't reach the server. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const updateMember = (guestId: string, patch: Partial<MemberDraft>) =>
    setMembers((prev) =>
      prev.map((m) => (m.guestId === guestId ? { ...m, ...patch } : m)),
    );

  /* ── Stage: found and answered ─────────────────────────────────────── */

  if (stage.kind === "done") {
    const coming = stage.rsvp.responses.filter((r) => r.attending);
    const plus = stage.rsvp.plusOnes;

    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow mb-4">Thank you</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          {coming.length > 0 ? "We can't wait to see you" : "We'll miss you"}
        </h1>

        <Ornament className="my-9" />

        <div className="card p-7 text-left">
          <p className="eyebrow mb-4">{stage.party.displayName}</p>
          <ul className="space-y-3">
            {stage.rsvp.responses.map((r) => (
              <li key={r.guestId} className="flex items-baseline justify-between gap-4">
                <span>{r.name}</span>
                <span className={r.attending ? "text-bloom text-sm" : "text-ink-faint text-sm"}>
                  {r.attending
                    ? r.events.map(eventName).join(", ")
                    : "Not able to come"}
                </span>
              </li>
            ))}
            {plus.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-4">
                <span>{p.name}</span>
                <span className="text-bloom text-sm">Coming</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          A copy of this is saved against your invitation. You can change it any time
          before {wedding.rsvpDeadline} by looking yourself up again.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setStage({ kind: "lookup" });
              setQuery("");
            }}
          >
            Change your reply
          </button>
          <Link href="/" className="btn btn-primary">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  /* ── Stage: several invitations matched ────────────────────────────── */

  if (stage.kind === "choose") {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow mb-4">Almost there</p>
        <h1 className="font-display text-4xl">Which invitation is yours?</h1>
        <ul className="mt-8 space-y-3 text-left">
          {stage.options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => lookup(option.id)}
                className="card w-full p-4 text-left transition-colors hover:border-bloom disabled:opacity-60"
              >
                {option.displayName}
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="mt-5 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button
          type="button"
          className="btn btn-ghost mt-8"
          onClick={() => setStage({ kind: "lookup" })}
        >
          Start again
        </button>
      </div>
    );
  }

  /* ── Stage: look yourself up ───────────────────────────────────────── */

  if (stage.kind === "lookup") {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow mb-4">RSVP</p>
        <h1 className="font-display text-4xl sm:text-5xl">Find your invitation</h1>
        <p className="mt-5 text-ink-soft leading-relaxed">
          Enter your full name as it appears on the envelope, or the code printed on
          your card.
        </p>

        <form
          className="mt-9"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <label htmlFor="lookup" className="sr-only">
            Your name or invitation code
          </label>
          <input
            id="lookup"
            className="field text-center"
            placeholder="Neha Desai, or ROWAN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="name"
            autoFocus
          />
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full">
            {busy ? "Looking…" : "Continue"}
          </button>
        </form>

        {!open && (
          <p className="mt-8 text-sm text-ink-faint">
            RSVPs have closed, but you can still look up what you told us.
          </p>
        )}
      </div>
    );
  }

  /* ── Stage: the form ───────────────────────────────────────────────── */

  const { party } = stage;
  const invitedEvents = wedding.events.filter((e) => party.events.includes(e.id));
  const allowance = party.plusOnesAllowed ?? 0;
  const anyoneComing = members.some((m) => m.attending === true);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="eyebrow mb-4">{stage.existing ? "Updating your reply" : "RSVP"}</p>
        <h1 className="font-display text-4xl sm:text-5xl">{party.displayName}</h1>
        <p className="mt-4 text-ink-soft">
          You&rsquo;re invited to{" "}
          {invitedEvents.map((e) => e.name).join(", ").replace(/, ([^,]*)$/, " and $1")}.
        </p>
      </div>

      <Ornament className="my-10" />

      <form onSubmit={submit} className="space-y-8">
        {members.map((draft) => {
          const member = party.members.find((m) => m.id === draft.guestId)!;
          return (
            <fieldset key={draft.guestId} className="card p-6">
              <legend className="sr-only">
                {member.firstName} {member.lastName}
              </legend>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl">
                  {member.firstName} {member.lastName}
                </h2>

                <div className="flex gap-2" role="group" aria-label="Attending?">
                  <button
                    type="button"
                    onClick={() => updateMember(draft.guestId, { attending: true })}
                    aria-pressed={draft.attending === true}
                    className={`btn ${draft.attending === true ? "btn-primary" : "btn-ghost"}`}
                  >
                    Joyfully accepts
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateMember(draft.guestId, { attending: false, events: [] })
                    }
                    aria-pressed={draft.attending === false}
                    className={`btn ${draft.attending === false ? "btn-primary" : "btn-ghost"}`}
                  >
                    Regretfully declines
                  </button>
                </div>
              </div>

              {draft.attending === true && (
                <div className="mt-6 space-y-6">
                  {invitedEvents.length > 1 && (
                    <div>
                      <span className="label">Coming to</span>
                      <ul className="space-y-2">
                        {invitedEvents.map((event) => (
                          <li key={event.id}>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-1 accent-bloom"
                                checked={draft.events.includes(event.id)}
                                onChange={(e) =>
                                  updateMember(draft.guestId, {
                                    events: e.target.checked
                                      ? [...draft.events, event.id]
                                      : draft.events.filter((id) => id !== event.id),
                                  })
                                }
                              />
                              <span className="text-sm">
                                {event.name}
                                <span className="block text-ink-faint">
                                  {formatDayAndMonth(event.start)},{" "}
                                  {formatTimeRange(event.start, event.end)}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wedding.meals.length > 0 && (
                    <div>
                      <label className="label" htmlFor={`meal-${draft.guestId}`}>
                        Dinner choice
                      </label>
                      <select
                        id={`meal-${draft.guestId}`}
                        className="field"
                        value={draft.mealId}
                        onChange={(e) =>
                          updateMember(draft.guestId, { mealId: e.target.value })
                        }
                      >
                        <option value="">Please choose…</option>
                        {wedding.meals.map((meal) => (
                          <option key={meal.id} value={meal.id}>
                            {meal.name} — {meal.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label" htmlFor={`diet-${draft.guestId}`}>
                      Allergies or dietary needs
                    </label>
                    <input
                      id={`diet-${draft.guestId}`}
                      className="field"
                      value={draft.dietary}
                      onChange={(e) =>
                        updateMember(draft.guestId, { dietary: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}
            </fieldset>
          );
        })}

        {allowance > 0 && anyoneComing && (
          <fieldset className="card p-6">
            <legend className="sr-only">Additional guests</legend>
            <h2 className="font-display text-2xl">
              Bringing someone?
              <span className="ml-2 font-body text-sm text-ink-faint align-middle">
                {allowance} place{allowance === 1 ? "" : "s"} held
              </span>
            </h2>

            <div className="mt-5 space-y-5">
              {plusOnes.map((plus, index) => (
                <div key={index} className="space-y-3 border-l border-line pl-4">
                  <div className="flex gap-3">
                    <input
                      className="field"
                      placeholder="Their full name"
                      value={plus.name}
                      onChange={(e) =>
                        setPlusOnes((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, name: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove guest"
                      className="btn btn-ghost !px-4"
                      onClick={() =>
                        setPlusOnes((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  </div>

                  {wedding.meals.length > 0 && (
                    <select
                      className="field"
                      aria-label="Dinner choice"
                      value={plus.mealId}
                      onChange={(e) =>
                        setPlusOnes((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, mealId: e.target.value } : p,
                          ),
                        )
                      }
                    >
                      <option value="">Dinner choice…</option>
                      {wedding.meals.map((meal) => (
                        <option key={meal.id} value={meal.id}>
                          {meal.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    className="field"
                    aria-label="Their dietary needs"
                    placeholder="Their allergies or dietary needs (optional)"
                    value={plus.dietary}
                    onChange={(e) =>
                      setPlusOnes((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, dietary: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </div>
              ))}

              {plusOnes.length < allowance && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setPlusOnes((prev) => [...prev, { name: "", mealId: "", dietary: "" }])
                  }
                >
                  Add a guest
                </button>
              )}
            </div>
          </fieldset>
        )}

        <fieldset className="card p-6 space-y-5">
          <legend className="sr-only">Contact details</legend>

          <div>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="So we can send you the details closer to the day"
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Phone <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {wedding.collectSongRequests && anyoneComing && (
            <div>
              <label className="label" htmlFor="song">
                A song that will get you dancing
              </label>
              <input
                id="song"
                className="field"
                value={songRequest}
                onChange={(e) => setSongRequest(e.target.value)}
                placeholder="Artist — Title"
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="note">
              Anything else
            </label>
            <textarea
              id="note"
              rows={3}
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — a message, a warning, a request"
            />
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStage({ kind: "lookup" })}
          >
            Not you?
          </button>
          <button type="submit" disabled={busy || !open} className="btn btn-primary">
            {busy ? "Sending…" : stage.existing ? "Update reply" : "Send reply"}
          </button>
        </div>

        {!open && (
          <p className="text-sm text-ink-faint text-right">
            RSVPs have closed — email {wedding.contact.email} if something has changed.
          </p>
        )}
      </form>
    </div>
  );
}
