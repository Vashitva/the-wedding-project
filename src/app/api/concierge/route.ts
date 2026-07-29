import Anthropic from "@anthropic-ai/sdk";
import { wedding } from "@config/wedding";
import { SYSTEM_PROMPT } from "@/lib/concierge/knowledge";
import { TOOLS, runTool, type Action } from "@/lib/concierge/tools";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * The concierge endpoint.
 *
 * Runs the tool loop server-side and streams the answer back as newline-
 * delimited JSON. The API key never leaves this process.
 *
 * Nothing is persisted. A guest asking for directions types where they live,
 * which is their personal data sitting in a prompt — so it is used for the one
 * request and dropped. The conversation lives in the browser tab and nowhere
 * else; close it and it is gone.
 */

export const runtime = "nodejs";
/** The knowledge document is built from config at module load, so never cache. */
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";
/** Room for a short answer plus the thinking that precedes it. */
const MAX_TOKENS = 3000;
/** Generous for a person typing, tight enough to be useless for scraping. */
const LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 };
const MAX_MESSAGE = 800;
const MAX_TURNS = 24;
/** Tool calls per answer. Two tools exist; anything beyond this is a loop. */
const MAX_TOOL_ROUNDS = 4;

type Turn = { role: "user" | "assistant"; content: string };

type Chunk =
  | { type: "text"; text: string }
  | { type: "action"; action: Action }
  | { type: "error"; message: string };

function line(chunk: Chunk): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(chunk)}\n`);
}

export async function POST(request: Request) {
  if (!wedding.concierge.enabled) {
    return Response.json({ error: "The concierge is switched off." }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const conversation: Anthropic.MessageParam[] = messages.map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));

      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const answer = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            // Adaptive rather than off: with thinking disabled the model can
            // write a tool call into its visible text, which reads as a normal
            // reply while silently doing nothing. Low effort keeps it quick —
            // this is a lookup, not a reasoning problem.
            thinking: { type: "adaptive" },
            output_config: { effort: "low" },
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                // The whole prompt is identical for every guest and every
                // question, so it is one cacheable prefix. Only the messages
                // that follow it differ.
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: TOOLS,
            messages: conversation,
          });

          answer.on("text", (delta) => controller.enqueue(line({ type: "text", text: delta })));

          const message = await answer.finalMessage();

          const toolUses = message.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
          );

          if (toolUses.length === 0) break;

          conversation.push({ role: "assistant", content: message.content });

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const use of toolUses) {
            const outcome = runTool(use.name, use.input);
            // Sent before the model narrates it, so the button is already on
            // screen by the time the sentence describing it arrives.
            if (outcome.action) {
              controller.enqueue(line({ type: "action", action: outcome.action }));
            }
            results.push({
              type: "tool_result",
              tool_use_id: use.id,
              content: outcome.result,
            });
          }

          conversation.push({ role: "user", content: results });

          if (round === MAX_TOOL_ROUNDS) {
            controller.enqueue(
              line({
                type: "error",
                message: `I got a bit stuck there — could you ask that another way, or email ${wedding.contact.email}?`,
              }),
            );
          }
        }
      } catch (error) {
        // The guest gets a usable sentence; the detail goes to the server log.
        console.error("[concierge]", error);
        controller.enqueue(
          line({
            type: "error",
            message: `Something went wrong at my end. ${wedding.contact.email} will always get you a person.`,
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
