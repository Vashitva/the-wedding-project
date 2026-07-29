import Anthropic from "@anthropic-ai/sdk";
import { wedding } from "@config/wedding";
import { TOOL_SPECS, runTool } from "../tools";
import {
  apiKeyFor,
  modelFor,
  PROVIDER_LABEL,
  type AnswerRequest,
  type Provider,
} from "../provider";

/** Room for a short answer plus the thinking that precedes it. */
const MAX_TOKENS = 3000;
/** Two tools exist; anything past this is a loop, not a plan. */
const MAX_TOOL_ROUNDS = 4;

const TOOLS: Anthropic.Tool[] = TOOL_SPECS.map((spec) => ({
  name: spec.name,
  description: spec.description,
  input_schema: spec.schema,
}));

export function createAnthropicProvider(): Provider {
  const apiKey = apiKeyFor("anthropic");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const client = new Anthropic({ apiKey });
  const model = modelFor("anthropic");

  return {
    id: "anthropic",
    label: PROVIDER_LABEL.anthropic,
    model,

    async answer({ system, messages, emit }: AnswerRequest) {
      const conversation: Anthropic.MessageParam[] = messages.map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const stream = client.messages.stream({
          model,
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
              text: system,
              // The prompt is identical for every guest and every question, so
              // it is one cacheable prefix; only the messages after it differ.
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: TOOLS,
          messages: conversation,
        });

        stream.on("text", (delta) => emit({ type: "text", text: delta }));

        const message = await stream.finalMessage();

        const toolUses = message.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );
        if (toolUses.length === 0) return;

        conversation.push({ role: "assistant", content: message.content });

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of toolUses) {
          const outcome = runTool(use.name, use.input);
          // Emitted before the model narrates it, so the button is already on
          // screen by the time the sentence describing it arrives.
          if (outcome.action) emit({ type: "action", action: outcome.action });
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: outcome.result,
          });
        }

        conversation.push({ role: "user", content: results });
      }

      emit({
        type: "error",
        message: `I got a bit stuck there — could you ask that another way, or email ${wedding.contact.email}?`,
      });
    },
  };
}
