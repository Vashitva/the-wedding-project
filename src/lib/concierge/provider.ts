import { wedding } from "@config/wedding";
import type { Action } from "./tools";

/**
 * Which model answers the concierge, and how that gets decided.
 *
 * Two vendors, one interface. Each adapter runs its *own* tool loop rather
 * than sharing one: Anthropic returns content blocks and OpenAI returns
 * accumulating tool-call deltas, and a lowest-common-denominator loop that
 * covered both would be harder to follow than two idiomatic ones. What is
 * shared is everything that matters for correctness — the same grounding
 * document, the same tool schemas, the same executors, the same chunk
 * protocol out to the browser.
 */

export const PROVIDER_IDS = ["anthropic", "openai"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

export type ConciergeChunk =
  | { type: "text"; text: string }
  | { type: "action"; action: Action }
  | { type: "error"; message: string };

export type AnswerRequest = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  /** Called as the answer arrives. Text may be a single word. */
  emit: (chunk: ConciergeChunk) => void;
};

export type Provider = {
  id: ProviderId;
  label: string;
  model: string;
  answer(request: AnswerRequest): Promise<void>;
};

const ENV_KEY: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

export function apiKeyFor(id: ProviderId): string | undefined {
  const value = process.env[ENV_KEY[id]];
  return value && value.trim() ? value.trim() : undefined;
}

export function envKeyName(id: ProviderId): string {
  return ENV_KEY[id];
}

export function modelFor(id: ProviderId): string {
  return wedding.concierge.models[id];
}

/** Where a choice came from — surfaced in the dashboard so it isn't a guess. */
export type ProviderSource = "admin" | "env" | "config" | "only-key" | "none";

export type Resolution = {
  id: ProviderId | null;
  source: ProviderSource;
  /** One sentence for the dashboard. Always set. */
  reason: string;
  /** Providers that currently have a key, in config order. */
  available: ProviderId[];
  /** A preference that had to be ignored, and why. Null when all is well. */
  ignored: { id: ProviderId; source: ProviderSource; reason: string } | null;
};

/**
 * Resolves the provider from, in order: the admin's choice, the environment,
 * the configured default, and finally whichever single key happens to exist.
 *
 * The rule that matters is that **a preference is only honoured if its key is
 * present**. Someone setting `CONCIERGE_PROVIDER=openai` without
 * `OPENAI_API_KEY` has made a mistake, and the useful response is to keep
 * answering guests on the key that does work while telling the couple exactly
 * what was ignored — not to switch the concierge off, and not to silently
 * pretend the preference was honoured.
 *
 * @param adminChoice the persisted dashboard setting, or null for "no opinion"
 */
export function resolveProvider(adminChoice: ProviderId | null): Resolution {
  const available = PROVIDER_IDS.filter((id) => apiKeyFor(id));

  if (available.length === 0) {
    return {
      id: null,
      source: "none",
      reason: `No API key is set. Add ${ENV_KEY.anthropic} or ${ENV_KEY.openai} to switch the concierge on.`,
      available,
      ignored: null,
    };
  }

  const envChoice = process.env.CONCIERGE_PROVIDER?.trim().toLowerCase();
  const configChoice = wedding.concierge.defaultProvider;

  const preferences: { id: ProviderId; source: ProviderSource }[] = [];
  if (adminChoice) preferences.push({ id: adminChoice, source: "admin" });
  if (isProviderId(envChoice)) preferences.push({ id: envChoice, source: "env" });
  if (isProviderId(configChoice)) preferences.push({ id: configChoice, source: "config" });

  const describe: Record<ProviderSource, string> = {
    admin: "chosen in the dashboard",
    env: "set by CONCIERGE_PROVIDER",
    config: "the configured default",
    "only-key": "the only key that is set",
    none: "",
  };

  let ignored: Resolution["ignored"] = null;

  for (const preference of preferences) {
    if (available.includes(preference.id)) {
      return {
        id: preference.id,
        source: preference.source,
        reason: `${PROVIDER_LABEL[preference.id]} — ${describe[preference.source]}.`,
        available,
        ignored,
      };
    }
    // Record only the first unusable preference: it is the one the couple
    // actually asked for, and a chain of ignored fallbacks is just noise.
    ignored ??= {
      id: preference.id,
      source: preference.source,
      reason: `${PROVIDER_LABEL[preference.id]} was ${describe[preference.source]}, but ${ENV_KEY[preference.id]} is not set.`,
    };
  }

  const fallback = available[0];
  return {
    id: fallback,
    source: available.length === 1 ? "only-key" : "config",
    reason:
      available.length === 1
        ? `${PROVIDER_LABEL[fallback]} — the only key that is set.`
        : `${PROVIDER_LABEL[fallback]} — first available key.`,
    available,
    ignored,
  };
}

/**
 * Loads the chosen adapter. Imported lazily so that installing one vendor's
 * SDK is enough — a deployment using only OpenAI never evaluates the
 * Anthropic module, and vice versa.
 */
export async function loadProvider(id: ProviderId): Promise<Provider> {
  if (id === "anthropic") {
    const { createAnthropicProvider } = await import("./providers/anthropic");
    return createAnthropicProvider();
  }
  const { createOpenAiProvider } = await import("./providers/openai");
  return createOpenAiProvider();
}
