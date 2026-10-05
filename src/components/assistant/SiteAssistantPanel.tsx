"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { applyAssistantAction } from "@/lib/ai/assistantApply";
import { diffText, type TextChange } from "@/lib/ai/rewrite";
import type { AssistantAction } from "@/lib/ai/siteAssistant";
import { defaultSection } from "@/lib/pageSchema";
import { ensureSession } from "@/lib/supabase/browser";
import { describeSections } from "@/templates/pagePresets";

type ApplyState = "applying" | { done: string } | { error: string };
type ChatEntry = { role: "user" | "assistant"; content: string; actions?: AssistantAction[]; error?: boolean };
type Usage = { used: number; limit: number | null };
type Stored = { messages: ChatEntry[]; applied: Record<string, ApplyState>; open: boolean };

const MAX_STORED = 30;

const GENERAL_IDEAS = [
  "Make my homepage headline stronger",
  "Add 3 FAQs about delivery and payment",
  "Add a pricing page",
  "What should I improve on my site?",
];
const PAGE_IDEAS = ["Make this page more persuasive", "Write SEO for this page", "Shorten the text on this page"];

function storageKey(siteId: string) {
  return `sulva-ai-chat:${siteId}`;
}

function load(siteId: string): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(siteId));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function save(siteId: string, value: Stored) {
  try {
    window.sessionStorage.setItem(storageKey(siteId), JSON.stringify(value));
  } catch {
    // Storage full or blocked: the chat still works, it just won't survive a reload.
  }
}

/** Page key the user is editing, from /…/pages/<key> or /…/extra-pages/<key>. */
function focusFromPath(pathname: string): string | undefined {
  const m = pathname.match(/\/(?:extra-)?pages\/([^/?#]+)\/?$/);
  return m ? decodeURIComponent(m[1]!) : undefined;
}

function plain(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function fieldName(path: string) {
  return path
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/\./g, " › ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function changesFor(action: AssistantAction): TextChange[] {
  switch (action.type) {
    case "edit_section":
      return diffText(action.before, action.after);
    case "add_section":
      return diffText(defaultSection(action.section.type), action.section);
    case "set_seo":
      return diffText(action.before, action.after);
    default:
      return [];
  }
}

function actionKey(msgIndex: number, action: AssistantAction) {
  return `${msgIndex}:${action.id}`;
}

export default function SiteAssistantPanel({
  siteId,
  editorBase,
}: {
  siteId: string;
  /** Base for editor links, e.g. /admin/sites/<id> or /dashboard/<id>/content. */
  editorBase: string;
}) {
  const pathname = usePathname() ?? "";
  const focusPage = focusFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [applied, setApplied] = useState<Record<string, ApplyState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Restore the conversation (it survives the editor reload that follows an applied change).
  useEffect(() => {
    const stored = load(siteId);
    if (stored) {
      setMessages(stored.messages ?? []);
      setApplied(stored.applied ?? {});
      setOpen(Boolean(stored.open));
    }
    setHydrated(true);
  }, [siteId]);

  useEffect(() => {
    if (hydrated) save(siteId, { messages: messages.slice(-MAX_STORED), applied, open });
  }, [siteId, messages, applied, open, hydrated]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const authHeaders = useCallback(async () => {
    const session = await ensureSession();
    return { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` };
  }, []);

  useEffect(() => {
    if (!open || usage) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/assistant`, { headers: await authHeaders() });
        const json = (await res.json().catch(() => null)) as { usage?: Usage } | null;
        if (alive && json?.usage) setUsage(json.usage);
      } catch {
        // Usage is informational only.
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, usage, siteId, authHeaders]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatEntry[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/assistant`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          focusPage,
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { reply?: string; actions?: AssistantAction[]; usage?: Usage; error?: string }
        | null;
      if (json?.usage) setUsage(json.usage);
      if (!res.ok || !json?.reply) throw new Error(json?.error ?? "The assistant is unavailable right now.");
      setMessages((m) => [...m, { role: "assistant", content: json.reply!, actions: json.actions ?? [] }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong.", error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function apply(msgIndex: number, action: AssistantAction) {
    const key = actionKey(msgIndex, action);
    setApplied((a) => ({ ...a, [key]: "applying" }));
    try {
      const result = await applyAssistantAction(siteId, action);
      if (!result.ok) {
        setApplied((a) => ({ ...a, [key]: { error: result.error } }));
        return;
      }
      setApplied((a) => ({ ...a, [key]: { done: result.key } }));
      // The open editor holds its own copy of this page; reload it so it shows the change
      // (and so a later "Save" there doesn't write the old text back).
      if (action.type !== "add_page" && action.page === focusPage) {
        save(siteId, { messages: messages.slice(-MAX_STORED), applied: { ...applied, [key]: { done: result.key } }, open: true });
        window.location.reload();
      }
    } catch (e) {
      setApplied((a) => ({ ...a, [key]: { error: e instanceof Error ? e.message : "Could not apply." } }));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function clearChat() {
    setMessages([]);
    setApplied({});
    setExpanded({});
  }

  function editorHref(action: AssistantAction, appliedKey: string) {
    if (action.type === "add_page") return `${editorBase}/extra-pages/${appliedKey}`;
    return `${editorBase}/${action.pageKind === "core" ? "pages" : "extra-pages"}/${action.page}`;
  }

  const outOfRequests = !!usage && usage.limit !== null && usage.used >= usage.limit;
  const ideas = focusPage ? [...PAGE_IDEAS, ...GENERAL_IDEAS.slice(1, 3)] : GENERAL_IDEAS;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-koi-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(10,15,31,.6)] hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
        aria-label="Ask AI to help with your site"
      >
        <span aria-hidden="true" className="text-koi-foam">✦</span> Ask AI
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="AI assistant"
      className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(680px,calc(100vh-2rem))] sm:w-[420px] sm:rounded-3xl sm:shadow-[0_24px_60px_-20px_rgba(10,15,31,.45)] sm:ring-1 sm:ring-koi-ink/10"
    >
      <header className="flex items-center justify-between gap-3 border-b border-koi-ink/5 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-koi-ink">
            <span aria-hidden="true" className="text-koi-sea">✦</span> Ask AI
          </div>
          <div className="truncate text-xs text-koi-ink/50">
            {usage?.limit != null ? `${usage.used} of ${usage.limit} requests used this month` : "Edits your site — you approve every change"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 ? (
            <button type="button" onClick={clearChat} className="rounded-full px-3 py-1.5 text-xs text-koi-ink/60 hover:bg-koi-paper">
              New chat
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="rounded-full px-3 py-1.5 text-lg leading-none text-koi-ink/60 hover:bg-koi-paper"
          >
            ×
          </button>
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-koi-ink/70">
              Tell me what you want to change and I&apos;ll draft it. Nothing changes on your site until you tap{" "}
              <strong>Apply</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => void send(idea)}
                  disabled={busy || outOfRequests}
                  className="rounded-full bg-koi-paper px-3 py-1.5 text-left text-xs font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-white disabled:opacity-60"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 whitespace-pre-line rounded-2xl rounded-br-md bg-koi-ink px-3.5 py-2.5 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-4 space-y-2">
              <div
                className={`whitespace-pre-line rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm ${
                  m.error ? "border border-red-200 bg-red-50 text-red-700" : "bg-koi-paper text-koi-ink"
                }`}
              >
                {m.content}
              </div>
              {(m.actions ?? []).map((action) => {
                const key = actionKey(i, action);
                const state = applied[key];
                const done = state && typeof state === "object" && "done" in state ? state.done : null;
                const changes = changesFor(action);
                const isOpen = expanded[key] ?? false;
                const pageName = action.type === "add_page" ? action.label : action.pageLabel;
                const live = action.type !== "add_page" && action.pageLive;
                return (
                  <div key={key} className="rounded-2xl bg-white p-3 ring-1 ring-koi-ink/10">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-koi-ink/45">
                      {action.type === "add_page" ? "New page" : `${pageName} page`}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-koi-ink">{action.summary}</div>

                    {action.type === "add_page" ? (
                      <p className="mt-1 text-xs text-koi-ink/55">
                        Includes: {describeSections(action.data.sections.map((s) => s.type))}. Added as a hidden draft.
                      </p>
                    ) : live ? (
                      <p className="mt-1 text-xs text-amber-700">This page is live — the change shows on your site right away.</p>
                    ) : null}
                    {action.type !== "add_page" && action.page === focusPage && !done ? (
                      <p className="mt-1 text-xs text-koi-ink/55">Applying reloads this editor — save your own edits first.</p>
                    ) : null}

                    {changes.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpanded((x) => ({ ...x, [key]: !isOpen }))}
                          className="mt-2 text-xs font-medium text-koi-deep underline underline-offset-2"
                        >
                          {isOpen ? "Hide changes" : `See changes (${changes.length})`}
                        </button>
                        {isOpen ? (
                          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                            {changes.map((c, ci) => (
                              <li key={ci} className="rounded-xl bg-koi-paper p-2 text-xs">
                                <div className="font-medium text-koi-ink/60">{fieldName(c.path)}</div>
                                {plain(c.before) ? (
                                  <div className="mt-1 text-koi-ink/45 line-through">{plain(c.before)}</div>
                                ) : null}
                                <div className="mt-1 text-koi-ink">{plain(c.after)}</div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {done ? (
                        <>
                          <span className="text-xs font-medium text-emerald-700">✓ Applied</span>
                          <Link href={editorHref(action, done)} className="text-xs font-medium text-koi-ink underline underline-offset-2">
                            {action.type === "add_page" ? "Open page" : "Open in editor"}
                          </Link>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void apply(i, action)}
                          disabled={state === "applying"}
                          className="rounded-full bg-koi-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                        >
                          {state === "applying" ? "Applying…" : live ? "Apply to live site" : "Apply"}
                        </button>
                      )}
                    </div>
                    {state && typeof state === "object" && "error" in state ? (
                      <p className="mt-2 text-xs text-red-700">{state.error}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ),
        )}

        {busy ? (
          <div className="mr-4 inline-flex rounded-2xl rounded-bl-md bg-koi-paper px-3.5 py-2.5 text-sm text-koi-ink/60">
            Working on it…
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-koi-ink/5 p-3">
        {outOfRequests ? (
          <p className="mb-2 text-xs text-amber-700">
            You&apos;ve used this month&apos;s AI requests. They reset on the 1st.
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={focusPage ? "e.g. Make this page sound more premium" : "e.g. Add a page about our delivery areas"}
            disabled={outOfRequests}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-koi-ink/10 bg-white px-3.5 py-2.5 text-sm text-koi-ink outline-none focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || outOfRequests}
            className="rounded-full bg-koi-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
