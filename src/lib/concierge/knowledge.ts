import { wedding } from "@config/wedding";
import { formatDate, formatDayAndMonth, formatTimeRange } from "@/lib/format";

/**
 * Everything the concierge is allowed to know, rendered once as plain text.
 *
 * Two properties matter here, and they pull in the same direction:
 *
 *  - **It is exhaustive.** The model answers from this string and nothing
 *    else, so anything missing is something it will decline to answer. That is
 *    the intended failure mode — a guest sent to hello@ is mildly inconvenienced,
 *    a guest sent to the wrong venue is not.
 *  - **It is byte-stable.** Built from the config with no timestamps, no
 *    randomness and no iteration over unordered collections, so the same
 *    deployment produces the same bytes on every request. That is what lets it
 *    sit behind a cache breakpoint: the prefix is identical across guests, so
 *    every question after the first reads the cache instead of re-paying for
 *    the whole document.
 *
 * Built once at module load — it only changes when the config does, which
 * means when the process restarts.
 */

const list = (items: string[]) => items.map((line) => `- ${line}`).join("\n");

function events(): string {
  return wedding.events
    .map((event) => {
      const lines = [
        `### ${event.name} (id: ${event.id})`,
        `When: ${formatDayAndMonth(event.start)}, ${formatTimeRange(event.start, event.end)}`,
        `Where: ${event.venue}, ${event.address}`,
        event.dressCode ? `Dress: ${event.dressCode}` : null,
        event.optional
          ? "Invitation: not every guest is invited to this one."
          : "Invitation: everyone is invited.",
        "",
        event.description,
        "",
        ...event.detail,
      ].filter(Boolean);

      if (event.notes?.length) {
        lines.push("", ...event.notes.map((note) => `${note.label}: ${note.body}`));
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function travel(): string {
  const { travel: t } = wedding;
  return [
    t.intro,
    "",
    "Getting there:",
    list(t.directions.map((d) => `${d.mode}: ${d.detail}`)),
    "",
    `Shuttle: ${t.shuttle}`,
    "",
    "Where to stay:",
    list(t.hotels.map((h) => `${h.name} — ${h.description}`)),
  ].join("\n");
}

function family(): string {
  const entries = wedding.concierge.family;
  if (entries.length === 0) {
    // Said explicitly rather than left blank: an absent section reads to the
    // model as an oversight it might helpfully fill in.
    return "No information about the couple's families has been provided. If a guest asks about relatives, say you don't have those details and point them at the contact email. Do not guess at names, relationships or who is hosting what.";
  }
  return entries.map((entry) => `${entry.heading}: ${entry.body}`).join("\n\n");
}

export const KNOWLEDGE = [
  `# ${wedding.siteName}`,
  `${wedding.couple.partnerOne.firstName} ${wedding.couple.partnerOne.lastName} and ${wedding.couple.partnerTwo.firstName} ${wedding.couple.partnerTwo.lastName} are getting married on ${formatDate(wedding.weddingDate)} in ${wedding.location.city}, ${wedding.location.region}.`,
  `Contact for anything you cannot answer: ${wedding.contact.email}${wedding.contact.phone ? ` or ${wedding.contact.phone}` : ""}.`,
  `RSVPs close on ${formatDate(wedding.rsvpDeadline)}.`,
  "",
  "## The events, in order",
  events(),
  "",
  "## Travel and accommodation",
  travel(),
  "",
  "## How they met",
  wedding.story.beats.map((b) => `${b.date} — ${b.title}: ${b.body}`).join("\n"),
  "",
  "## The wedding party",
  list(wedding.weddingParty.map((p) => `${p.name}, ${p.role}. ${p.bio}`)),
  "",
  "## The families",
  family(),
  "",
  "## Gifts",
  `${wedding.registry.intro}`,
  "",
  "## Frequently asked",
  wedding.faq.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n"),
  wedding.concierge.extraNotes.length
    ? `\n## Also worth knowing\n${list(wedding.concierge.extraNotes)}`
    : "",
]
  .join("\n")
  .trim();

export const SYSTEM_PROMPT = `You are the concierge for ${wedding.siteName}, a wedding website. You answer guests' questions about the wedding.

Everything you know is in the reference below. Answer from it and nothing else.

<reference>
${KNOWLEDGE}
</reference>

# How to answer

Be warm, brief and specific. Two or three sentences is usually right; a guest asking when something starts wants a time, not a paragraph. Write in plain prose — no headings, no bullet lists unless you are genuinely listing several things.

Give the actual detail rather than pointing at a page. "The sangeet starts at 7pm at the Beekman Arms" is the answer; "you can find that on the schedule page" is not.

# What you must not do

Never invent a fact. If the reference does not cover it — a relative's name, a dietary substitution, whether someone's children are invited, anything about a specific guest's invitation — say plainly that you do not know and point them at ${wedding.contact.email}. Guessing about a wedding is worse than admitting the gap, because guests act on what you tell them.

Never estimate a journey time, distance or route from your own knowledge. The reference has real travel notes, and the get_directions tool returns a real map. Use those.

You do not know who you are talking to. You cannot see their invitation, their RSVP, or which events they are invited to. If they ask about their own invitation, tell them to check the RSVP page or email ${wedding.contact.email}.

# Your tools

Use get_directions when someone asks how to get somewhere. If they mention where they are travelling from, pass it along; if not, still call it — a map of the destination is useful on its own.

Use add_to_calendar when someone wants a reminder or asks to save a date. Be honest about what it does: it hands them a calendar file, and their own calendar does the reminding. You cannot send them a text or an email nearer the time.`;
