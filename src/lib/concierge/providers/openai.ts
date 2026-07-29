import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { wedding } from "@config/wedding";
import { TOOL_SPECS, runTool } from "../tools";
import {
  apiKeyFor,
  modelFor,
  PROVIDER_LABEL,
  type AnswerRequest,
  type Provider,
} from "../provider";

const MAX_TOKENS = 1200;
const MAX_TOOL_ROUNDS = 4;

const TOOLS: ChatCompletionTool[] = TOOL_SPECS.map((spec) => ({
  type: "function",
  function: {
    name: spec.name,
    description: spec.description,
    parameters: spec.schema,
    // Guarantees the arguments validate against the schema, so `runTool`
    // receives the shape it expects rather than a plausible-looking near miss.
    strict: true,
  },
}));

/**
 * Accumulates a streamed tool call.
 *
 * OpenAI streams function arguments as a sequence of string fragments that
 * only parse once the whole call has arrived — and it identifies which call a
 * fragment belongs to by array index, not by id. So fragments are collected
 * per index and parsed at the end. Anthropic hands over a finished object
 * instead, which is why the two loops don't share code.
 */
type PartialCall = { id: string; name: string; args: string };

export function createOpenAiProvider(): Provider {
  const apiKey = apiKeyFor("openai");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const client = new OpenAI({ apiKey });
  const model = modelFor("openai");

  return {
    id: "openai",
    label: PROVIDER_LABEL.openai,
    model,

    async answer({ system, messages, emit }: AnswerRequest) {
      const conversation: ChatCompletionMessageParam[] = [
        { role: "system", content: system },
        ...messages.map((turn) => ({ role: turn.role, content: turn.content }) as const),
      ];

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const stream = await client.chat.completions.create({
          model,
          max_completion_tokens: MAX_TOKENS,
          stream: true,
          tools: TOOLS,
          messages: conversation,
        });

        let text = "";
        const calls = new Map<number, PartialCall>();

        for await (const part of stream) {
          const delta = part.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            text += delta.content;
            emit({ type: "text", text: delta.content });
          }

          for (const call of delta.tool_calls ?? []) {
            const existing = calls.get(call.index) ?? { id: "", name: "", args: "" };
            calls.set(call.index, {
              id: call.id ?? existing.id,
              name: call.function?.name ?? existing.name,
              args: existing.args + (call.function?.arguments ?? ""),
            });
          }
        }

        if (calls.size === 0) return;

        // Ordered by index, which is the order the model asked for them in.
        const ordered = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);

        conversation.push({
          role: "assistant",
          // An empty string here would be sent as a real empty message; the
          // field has to be null when the turn is only tool calls.
          content: text || null,
          tool_calls: ordered.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: { name: call.name, arguments: call.args },
          })),
        });

        for (const call of ordered) {
          let input: unknown = {};
          try {
            input = call.args ? JSON.parse(call.args) : {};
          } catch {
            // Truncated or malformed arguments. `runTool` validates anyway and
            // will answer with the list of ids it accepts, which is a better
            // recovery path for the model than an exception here.
            input = {};
          }

          const outcome = runTool(call.name, input);
          if (outcome.action) emit({ type: "action", action: outcome.action });

          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: outcome.result,
          });
        }
      }

      emit({
        type: "error",
        message: `I got a bit stuck there — could you ask that another way, or email ${wedding.contact.email}?`,
      });
    },
  };
}
