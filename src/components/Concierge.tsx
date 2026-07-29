"use client";

import { useEffect, useRef, useState } from "react";
import { wedding } from "@config/wedding";
import AddToCalendar from "./AddToCalendar";
import type { Action } from "@/lib/concierge/tools";

/**
 * The concierge: a panel that answers questions about the wedding.
 *
 * It is deliberately the least demanding thing on the page. It mounts closed,
 * fetches nothing until opened, and if the server has no API key it removes
 * its own button — a guest who never opens it pays nothing for its existence.
 *
 * Actions arrive as their own chunks in the stream and render as real
 * controls: the calendar chip is the same component the event pages use, so a
 * promise made in the chat is kept by the same code that keeps it elsewhere.
 */

type Message = {
  role: "user" | "assistant";
  content: string;
  actions: Action[];
  failed?: boolean;
};

const CALENDAR_EVENTS = wedding.events.map((event) => ({
  id: event.id,
  name: event.name,
  start: event.start,
  end: event.end,
  venue: event.venue,
  address: event.address,
  description: event.description,
}));

/**
 * The eight-petal lotus from the section dividers, at button scale.
 *
 * Reusing the page's own motif is what keeps the launcher reading as part of
 * the invitation rather than as a support widget bolted to the corner. Drawn
 * rather than imported so the stroke weight can be tuned for 18px, where the
 * divider's hairline would disappear.
 */
function LotusMark() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="-13 -13 26 26"
      fill="none"
      className="launcher-mark"
    >
      {Array.from({ length: 8 }, (_, i) => i * 45).map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-6.5"
          rx="2.7"
          ry="5.4"
          transform={`rotate(${angle})`}
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.9"
        />
      ))}
      <circle r="2" fill="currentColor" opacity="0.95" />
    </svg>
  );
}

function ActionChip({ action }: { action: Action }) {
  if (action.kind === "directions") {
    return (
      <a
        href={action.url}
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost text-xs"
      >
        {action.label} ↗
      </a>
    );
  }

  const events = CALENDAR_EVENTS.filter((event) => action.eventIds.includes(event.id));
  if (events.length === 0) return null;

  return (
    <AddToCalendar
      events={events}
      calendarName={`${wedding.siteName} — ${action.label}`}
      label={action.label}
      className="btn btn-ghost text-xs"
    />
  );
}

export default function Concierge() {
  const [available, setAvailable] = useState(true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest message in view as it streams in.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes it, the way every other overlay on the site behaves.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history = [...messages, { role: "user" as const, content: question, actions: [] }];
    setMessages([...history, { role: "assistant", content: "", actions: [] }]);
    setDraft("");
    setBusy(true);

    /** Rewrites the in-flight assistant message. */
    const patch = (change: (message: Message) => Message) => {
      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = change(next[next.length - 1]);
        return next;
      });
    };

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (response.status === 503) {
        // Deployed without a key. Take the whole feature off the page rather
        // than leaving a button that always fails.
        setAvailable(false);
        return;
      }

      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        patch((message) => ({
          ...message,
          failed: true,
          content:
            problem?.error ??
            `I couldn't reach my notes just then. ${wedding.contact.email} will always get you a person.`,
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Newline-delimited JSON: a chunk can split mid-line, so hold the tail
      // back until its newline arrives.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          if (!raw.trim()) continue;
          let chunk: { type: string; text?: string; action?: Action; message?: string };
          try {
            chunk = JSON.parse(raw);
          } catch {
            continue;
          }

          if (chunk.type === "text" && chunk.text) {
            const text = chunk.text;
            patch((message) => ({ ...message, content: message.content + text }));
          } else if (chunk.type === "action" && chunk.action) {
            const action = chunk.action;
            patch((message) => ({ ...message, actions: [...message.actions, action] }));
          } else if (chunk.type === "error" && chunk.message) {
            const text = chunk.message;
            patch((message) => ({
              ...message,
              failed: true,
              content: message.content ? `${message.content}\n\n${text}` : text,
            }));
          }
        }
      }

      patch((message) =>
        message.content || message.actions.length
          ? message
          : {
              ...message,
              failed: true,
              content: `I didn't manage an answer to that. ${wedding.contact.email} will always get you a person.`,
            },
      );
    } catch {
      patch((message) => ({
        ...message,
        failed: true,
        content: `I couldn't reach my notes — you may be offline. Everything I know is on this site, and ${wedding.contact.email} will always get you a person.`,
      }));
    } finally {
      setBusy(false);
    }
  };

  if (!wedding.concierge.enabled || !available) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="launcher fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
        >
          <LotusMark />
          {wedding.concierge.label}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={wedding.concierge.label}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85svh] flex-col border-t border-line bg-paper shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[34rem] sm:w-[24rem] sm:rounded-lg sm:border"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-lg">{wedding.concierge.label}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="px-2 text-2xl leading-none text-ink-faint hover:text-ink"
            >
              ×
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <p className="text-sm leading-relaxed text-ink-soft">
              {wedding.concierge.greeting}
            </p>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {wedding.concierge.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-bloom hover:text-bloom"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "flex justify-end" : ""}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-lg bg-paper-sunk px-3 py-2 text-sm"
                      : "max-w-full text-sm leading-relaxed"
                  }
                >
                  {message.content ? (
                    <p
                      className={`whitespace-pre-wrap ${message.failed ? "text-ink-faint" : ""}`}
                    >
                      {message.content}
                    </p>
                  ) : (
                    message.role === "assistant" && (
                      <p className="text-ink-faint" aria-live="polite">
                        Looking that up…
                      </p>
                    )
                  )}

                  {message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action, i) => (
                        <ActionChip key={i} action={action} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
            className="flex gap-2 border-t border-line px-4 py-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about the wedding…"
              maxLength={800}
              aria-label="Your question"
              className="min-w-0 flex-1 border border-line bg-paper px-3 py-2 text-sm focus:border-bloom focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="btn btn-primary text-sm disabled:opacity-40"
            >
              Ask
            </button>
          </form>

          <p className="px-4 pb-3 text-[0.65rem] leading-relaxed text-ink-faint">
            Answers come from this site. For anything else,{" "}
            <a href={`mailto:${wedding.contact.email}`} className="underline">
              {wedding.contact.email}
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}
