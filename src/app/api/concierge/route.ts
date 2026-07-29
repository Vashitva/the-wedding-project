import { wedding } from "@config/wedding";
import { SYSTEM_PROMPT } from "@/lib/concierge/knowledge";
import {
  loadProvider,
  resolveProvider,
  type ConciergeChunk,
} from "@/lib/concierge/provider";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { loadSettings } from "@/lib/settings";

/**
 * The concierge endpoint.
 *
 * Picks a provider, runs its tool loop server-side, and streams the answer
 * back as newline-delimited JSON. API keys never leave this process.
 *
 * Nothing is persisted. A guest asking for directions types where they live,
 * which is their personal data sitting in a prompt — so it is used for the one
 * request and dropped. The conversation lives in the browser tab and nowhere
 * else; close it and it is gone.
 */

export const runtime = "nodejs";
/** The knowledge document is built from config at module load, so never cache. */
export const dynamic = "force-dynamic";

/** Generous for a person typing, tight enough to be useless for scraping. */
const LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 };
const MAX_MESSAGE = 800;
const MAX_TURNS = 24;

type Turn = { role: "user" | "assistant"; content: string };

function line(chunk: ConciergeChunk): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(chunk)}\n`);
}

export async function POST(request: Request) {
  if (!wedding.concierge.enabled) {
    return Response.json({ error: "The concierge is switched off." }, { status: 404 });
  }

  const settings = await loadSettings();
  const resolution = resolveProvider(settings.conciergeProvider);

  if (!resolution.id) {
    // Not an error the guest caused — the site is simply deployed without a
    // key. The client hides the button when it sees this.
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  const limited = rateLimit(clientKey(request, "concierge"), LIMIT);
  if (!limited.ok) {
    return Response.json(
      { error: "That's a lot of questions at once — try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  // The transcript comes from the browser, so it is rebuilt rather than
  // trusted: roles are narrowed to the two we accept, content is coerced to a
  // string and clipped, and the whole thing is capped in length.
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages: Turn[] = incoming
    .slice(-MAX_TURNS)
    .map((raw) => {
      const turn = (raw ?? {}) as Record<string, unknown>;
      const role = turn.role === "assistant" ? "assistant" : "user";
      const content = typeof turn.content === "string" ? turn.content.slice(0, MAX_MESSAGE) : "";
      return { role, content } as Turn;
    })
    .filter((turn) => turn.content.length > 0);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask me something." }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (chunk: ConciergeChunk) => controller.enqueue(line(chunk));

      try {
        const provider = await loadProvider(resolution.id!);
        await provider.answer({ system: SYSTEM_PROMPT, messages, emit });
      } catch (error) {
        // The guest gets a usable sentence; the detail goes to the server log,
        // tagged with the provider so a bad model name or a rejected key is
        // obvious from the logs alone.
        console.error(`[concierge:${resolution.id}]`, error);
        emit({
          type: "error",
          message: `Something went wrong at my end. ${wedding.contact.email} will always get you a person.`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Handy when debugging which model answered; no secret in it.
      "X-Concierge-Provider": resolution.id,
    },
  });
}
