import type Anthropic from "@anthropic-ai/sdk";
import { wedding } from "@config/wedding";
import { mapsUrl } from "@/lib/format";

/**
 * What the concierge can actually do.
 *
 * Every tool here maps onto something the site already does — the maps link
 * the venue pages use, the calendar file the button downloads. Nothing is
 * invented for the chat window, which is the point: the model cannot offer a
 * capability that doesn't exist, because there is no tool for it.
 *
 * Tools return a short result for the model *and* an `action` for the browser.
 * The model narrates; the browser renders a real link or a real button. So
 * "here are your directions" is never just a sentence — there is always
 * something to press, and it does the same thing the rest of the site does.
 */

export type Action =
  | { kind: "directions"; label: string; url: string }
  | { kind: "calendar"; label: string; eventIds: string[] };

export type ToolOutcome = { result: string; action?: Action };

const eventIds = wedding.events.map((e) => e.id);

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_directions",
    description:
      "Get a map link and the wedding's own travel notes for one of the events. Call this whenever a guest asks how to reach a venue. Never describe a route or a journey time yourself — this returns the real thing.",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          enum: eventIds,
          description: "Which event's venue they are heading to.",
        },
        origin: {
          type: "string",
          description:
            "Where the guest is travelling from, exactly as they said it (e.g. 'Brooklyn', 'JFK', 'Penn Station'). Omit if they did not say.",
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "add_to_calendar",
    description:
      "Offer the guest a calendar file for one or more events. Use this when they ask for a reminder, ask to save the date, or say they will forget. Their calendar app does the reminding — you cannot send a message nearer the time.",
    input_schema: {
      type: "object",
      properties: {
        event_ids: {
          type: "array",
          items: { type: "string", enum: eventIds },
          description:
            "Which events to include. Use every id for the whole weekend.",
        },
      },
      required: ["event_ids"],
    },
  },
];

/**
 * Runs a tool. Input comes from the model, so nothing is trusted: ids are
 * checked against the config rather than interpolated, and the origin string
 * is URL-encoded before it goes anywhere near a link.
 */
export function runTool(name: string, input: unknown): ToolOutcome {
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === "get_directions") {
    const event = wedding.events.find((e) => e.id === args.event_id);
    if (!event) {
      return { result: `No event with that id. Valid ids: ${eventIds.join(", ")}.` };
    }

    const origin = typeof args.origin === "string" ? args.origin.trim().slice(0, 120) : "";
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(event.address)}`
      : mapsUrl(event.address);

    const notes = wedding.travel.directions
      .map((d) => `${d.mode}: ${d.detail}`)
      .join("\n");

    return {
      result: [
        `${event.name} is at ${event.venue}, ${event.address}.`,
        origin ? `A route from "${origin}" has been prepared.` : "A map has been prepared.",
        "",
        "The wedding's own travel notes:",
        notes,
        `Shuttle: ${wedding.travel.shuttle}`,
        "",
        "A link is already on screen for the guest — tell them it is there rather than pasting a URL.",
      ].join("\n"),
      action: {
        kind: "directions",
        label: origin ? `Directions from ${origin}` : `Map to ${event.venue}`,
        url,
      },
    };
  }

  if (name === "add_to_calendar") {
    const requested = Array.isArray(args.event_ids) ? args.event_ids : [];
    const ids = requested.filter(
      (id): id is string => typeof id === "string" && eventIds.includes(id),
    );
    if (ids.length === 0) {
      return { result: `No valid event ids. Valid ids: ${eventIds.join(", ")}.` };
    }

    const names = wedding.events.filter((e) => ids.includes(e.id)).map((e) => e.name);

    return {
      result: [
        `A calendar file covering ${names.join(", ")} is ready, and a button is already on screen.`,
        "Tell them to press it, and that their own calendar will do the reminding.",
      ].join("\n"),
      action: {
        kind: "calendar",
        label: names.length === 1 ? `Add ${names[0]}` : `Add ${names.length} events`,
        eventIds: ids,
      },
    };
  }

  return { result: `Unknown tool: ${name}` };
}
