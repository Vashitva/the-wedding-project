"use client";

import { useActionState } from "react";
import { setConciergeProvider, type ProviderState } from "@/app/admin/actions";
import {
  PROVIDER_LABEL,
  type ProviderId,
  type Resolution,
} from "@/lib/concierge/provider";

/**
 * The dashboard's concierge panel.
 *
 * It shows what is *actually* in force rather than what was asked for, because
 * those two can differ — a `CONCIERGE_PROVIDER` naming a vendor whose key is
 * missing gets ignored, and silently ignoring it is how a couple ends up
 * paying the wrong bill or wondering why nothing changed.
 */
export default function ConciergeSettings({
  resolution,
  chosen,
  model,
  keys,
}: {
  resolution: Resolution;
  /** The persisted dashboard override, or null for "let the environment decide". */
  chosen: ProviderId | null;
  model: string | null;
  /** Which provider keys are present, so unusable options can be disabled. */
  keys: Record<ProviderId, boolean>;
}) {
  const [state, action, pending] = useActionState<ProviderState, FormData>(
    setConciergeProvider,
    {},
  );

  const options: { value: string; label: string; enabled: boolean }[] = [
    { value: "", label: "Let the environment decide", enabled: true },
    ...(Object.keys(PROVIDER_LABEL) as ProviderId[]).map((id) => ({
      value: id,
      label: keys[id] ? PROVIDER_LABEL[id] : `${PROVIDER_LABEL[id]} (no key set)`,
      enabled: keys[id],
    })),
  ];

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl mb-4">The concierge</h2>

      <div className="card divide-y divide-line">
        <div className="px-5 py-4">
          <p className="eyebrow mb-1.5">Answering now</p>
          {resolution.id ? (
            <p className="text-ink-soft">
              {resolution.reason}
              {model && <span className="block text-xs text-ink-faint">Model: {model}</span>}
            </p>
          ) : (
            <p className="text-ink-soft">{resolution.reason}</p>
          )}
        </div>

        {resolution.ignored && (
          <div className="px-5 py-4">
            <p className="eyebrow mb-1.5 !text-bloom">Ignored</p>
            <p className="text-sm text-ink-soft">{resolution.ignored.reason}</p>
          </div>
        )}

        <form action={action} className="px-5 py-4">
          <label htmlFor="provider" className="eyebrow mb-1.5 block">
            Use
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="provider"
              name="provider"
              defaultValue={chosen ?? ""}
              className="border border-line bg-paper px-3 py-2 text-sm"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value} disabled={!option.enabled}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={pending} className="btn btn-ghost text-sm">
              {pending ? "Saving…" : "Save"}
            </button>
            {state.saved && <span className="text-sm text-leaf">Saved</span>}
            {state.error && <span className="text-sm text-bloom">{state.error}</span>}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Takes effect on the next question — no redeploy. This is stored in{" "}
            <code>data/settings.json</code>, so on a host with an ephemeral disk it
            resets on deploy; set <code>CONCIERGE_PROVIDER</code> there instead.
            Keys always come from the environment, never from here.
          </p>
        </form>
      </div>
    </section>
  );
}
