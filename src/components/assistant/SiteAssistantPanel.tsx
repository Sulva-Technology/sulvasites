"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ATTACHMENT_KINDS, ATTACHMENT_TYPES, MAX_ATTACHMENTS, guessAttachmentKind } from "@/lib/ai/agent/attachments";
import { friendlyError } from "@/lib/ai/agent/friendlyErrors";
import type { AttachmentKind } from "@/lib/ai/agent/types";
import { applyAssistantAction, undoAssistantAction, type UndoRecord } from "@/lib/ai/assistantApply";
import { uploadAssistantAttachment } from "@/lib/assets";
import { formatNaira } from "@/lib/shop/money";
import { diffText, type TextChange } from "@/lib/ai/rewrite";
import { MAX_MESSAGE_CHARS, profileFieldLabel, type AssistantAction } from "@/lib/ai/siteAssistant";
import { sanitizePostHtml } from "@/lib/blog/sanitize";
import { defaultSection } from "@/lib/pageSchema";
import { ensureSession } from "@/lib/supabase/browser";
import { SECTION_LABELS, describeSections } from "@/templates/pagePresets";

type ApplyState =
  | "applying"
  | "undoing"
  | { done: string; undo: UndoRecord; error?: string }
  | { undone: true }
  | { skipped: true }
  | { error: string };
/** A file sent with a message. It is already in the site's storage, so only its address is kept. */
type SentFile = { kind: AttachmentKind; url: string; name?: string };
/** A file waiting in the composer: uploading, then ready to send. */
type PendingFile = { id: string; kind: AttachmentKind; preview: string; name: string; url?: string; error?: string };
type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
  error?: boolean;
  files?: SentFile[];
};

const KIND_NAMES: Record<AttachmentKind, string> = { photo: "Photo", logo: "Logo", document: "Document" };
const DEFAULT_ASK: Record<AttachmentKind, string> = {
  photo: "Add this as a product.",
  logo: "Here's my logo.",
  document: "Please use this.",
};
type Usage = { used: number; limit: number | null };
type Stored = { messages: ChatEntry[]; applied: Record<string, ApplyState>; open: boolean };

const MAX_STORED = 30;

const GENERAL_IDEAS = [
  "Which page is visited the most?",
  "Add a new product",
  "Write a blog post",
  "What's selling best, and what needs restocking?",
  "What should I improve on my site?",
  "Make my homepage headline stronger",
  "Update my opening hours",
];
const PAGE_IDEAS = ["Make this page more persuasive", "Write SEO for this page", "Shorten the text on this page"];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

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

/**
 * A file ready to upload: small JPG/PNG/WebP files as they are (a logo keeps its transparency), anything
 * bigger or in another format redrawn at most 1600px on its long side (PNG for logos, JPEG otherwise).
 */
async function prepare(file: File, kind: AttachmentKind): Promise<File> {
  if (ATTACHMENT_TYPES.includes(file.type) && file.size <= 2 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare pictures.");
  const png = kind === "logo";
  if (!png) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, png ? "image/png" : "image/jpeg", 0.85));
  if (!blob) throw new Error("This picture could not be prepared.");
  const base = file.name.replace(/\.[^.]+$/, "") || "picture";
  return new File([blob], `${base}.${png ? "png" : "jpg"}`, { type: blob.type });
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
    case "update_profile":
      return Object.keys(action.after).map((f) => ({
        path: profileFieldLabel(f),
        before: action.before[f as keyof typeof action.before] ?? "",
        after: action.after[f as keyof typeof action.after] || "(removed)",
      }));
    case "update_product":
      return (Object.keys(action.after) as Array<keyof typeof action.after>).map((f) => {
        const money = (v: unknown) => (typeof v === "number" ? formatNaira(v) : v == null ? "(none)" : String(v));
        const label = f === "priceKobo" ? "Price" : f === "compareAtKobo" ? "Was price" : f === "active" ? "Visible in shop" : f;
        const show = (v: unknown) => (typeof v === "boolean" ? (v ? "yes" : "no") : f === "priceKobo" || f === "compareAtKobo" ? money(v) : v == null || v === "" ? "(none)" : String(v));
        return { path: String(label), before: show(action.before[f]), after: show(action.after[f]) };
      });
    case "set_stock":
      return action.changes.map((c) => ({
        path: `${action.productName} · ${c.label}`,
        before: c.before === null ? "not tracked" : String(c.before),
        after: c.after === null ? "not tracked" : String(c.after),
      }));
    default:
      return [];
  }
}

function actionKey(entryId: string, action: AssistantAction) {
  return `${entryId}:${action.id}`;
}

function sectionGist(s: { type: string } & Record<string, unknown>) {
  const text = [s.headline, s.title].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return `${SECTION_LABELS[s.type as keyof typeof SECTION_LABELS] ?? s.type}${text ? ` (“${plain(text).slice(0, 60)}”)` : ""}`;
}

/** Plain explanation for changes that are not text edits. */
function noteFor(action: AssistantAction): string | null {
  if (action.type === "remove_section") return `Removes the ${sectionGist(action.before)} section from this page.`;
  if (action.type === "move_section") {
    return `Moves the ${sectionGist(action.before)} section from position ${action.sectionIndex + 1} to ${action.to + 1}.`;
  }
  if (action.type === "add_page") {
    return `Includes: ${describeSections(action.data.sections.map((s) => s.type))}. Added as a hidden draft.`;
  }
  if (action.type === "add_blog_post") {
    return action.post.publish
      ? `Publishes on your blog right away at /blog/${action.post.slug}.`
      : "Saved as a draft. Open it to add a cover photo, then publish.";
  }
  if (action.type === "add_product" && action.categoryIsNew) return `Creates the “${action.product.category}” category too.`;
  if (action.type === "update_product" && action.categoryIsNew) return `Creates the “${action.after.category}” category too.`;
  return null;
}

export default function SiteAssistantPanel({
  siteId,
  editorBase,
  profileHref,
}: {
  siteId: string;
  /** Base for editor links, e.g. /admin/sites/<id> or /dashboard/<id>/content. */
  editorBase: string;
  /** Where the business details are edited. */
  profileHref: string;
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
  const [attached, setAttached] = useState<PendingFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, number | null>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const siteBase = editorBase.endsWith("/content") ? editorBase.slice(0, -"/content".length) : editorBase;
  const shopBase = `${siteBase}/shop`;
  const blogBase = `${siteBase}/blog`;

  // Restore the conversation (it survives the editor reload that follows an applied change).
  useEffect(() => {
    const stored = load(siteId);
    if (stored) {
      setMessages((stored.messages ?? []).map((m) => ({ ...m, id: m.id ?? newId() })));
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

  /** Uploads chosen files to the site's storage right away, so sending only passes their addresses. */
  async function attach(files: FileList | null) {
    setAttachError(null);
    if (!files?.length) return;
    const room = MAX_ATTACHMENTS - attached.length;
    if (files.length > room) setAttachError(`You can attach up to ${MAX_ATTACHMENTS} files at a time.`);
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (fileRef.current) fileRef.current.value = "";
    const pending = chosen.map((f) => ({
      id: newId(),
      kind: guessAttachmentKind(f.name, input),
      preview: URL.createObjectURL(f),
      name: f.name.slice(0, 80),
    }));
    setAttached((a) => [...a, ...pending]);
    await Promise.all(
      chosen.map(async (file, i) => {
        const p = pending[i]!;
        try {
          const url = await uploadAssistantAttachment(siteId, await prepare(file, p.kind));
          setAttached((a) => a.map((x) => (x.id === p.id ? { ...x, url } : x)));
        } catch (e) {
          setAttached((a) => a.map((x) => (x.id === p.id ? { ...x, error: friendlyError(e) } : x)));
        }
      }),
    );
  }

  function removeAttached(id: string) {
    setAttached((a) => {
      const gone = a.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return a.filter((x) => x.id !== id);
    });
  }

  const uploading = attached.some((a) => !a.url && !a.error);
  const ready = attached.filter((a): a is PendingFile & { url: string } => !!a.url);

  async function send(text: string) {
    const content = text.trim() || (ready.length ? DEFAULT_ASK[ready[0]!.kind] : "");
    if (!content || busy || uploading) return;
    const files: SentFile[] = ready.map((a) => ({ kind: a.kind, url: a.url, name: a.name }));
    const userId = newId();
    const next: ChatEntry[] = [...messages, { id: userId, role: "user", content, files: files.length ? files : undefined }];
    setMessages(next);
    setInput("");
    attached.forEach((a) => URL.revokeObjectURL(a.preview));
    setAttached([]);
    setBusy(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/assistant`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          focusPage,
          attachments: files,
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { reply?: string; actions?: AssistantAction[]; usage?: Usage; error?: string }
        | null;
      if (json?.usage) setUsage(json.usage);
      if (!res.ok || !json?.reply) throw new Error(json?.error ?? "The assistant is unavailable right now. Please try again in a minute.");
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: json.reply!, actions: json.actions ?? [] }]);
    } catch (e) {
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: friendlyError(e), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  /** True when the screen behind the panel shows what `action` changes (and keeps its own copy of it). */
  function touchesOpenScreen(action: AssistantAction) {
    if (action.type === "update_profile") {
      return pathname.endsWith("/profile") || window.location.search.includes("view=settings");
    }
    if (action.type === "add_page" || action.type === "add_blog_post" || action.type === "add_product" || action.type === "update_product" || action.type === "set_stock") return false;
    return action.page === focusPage;
  }

  /** Reloads the open editor so a later "Save" there can't write old text back over an applied change. */
  function reloadEditor(nextApplied: Record<string, ApplyState>) {
    save(siteId, { messages: messages.slice(-MAX_STORED), applied: nextApplied, open: true });
    window.location.reload();
  }

  /** Applies one proposal. Returns the new state for it (the caller may reload the editor afterwards). */
  async function applyOne(entryId: string, action: AssistantAction): Promise<ApplyState> {
    const key = actionKey(entryId, action);
    setApplied((a) => ({ ...a, [key]: "applying" }));
    let state: ApplyState;
    try {
      const result = await applyAssistantAction(siteId, action, { imageIndex: picked[key] });
      state = result.ok ? { done: result.key, undo: result.undo } : { error: friendlyError(result.error) };
    } catch (e) {
      state = { error: friendlyError(e) };
    }
    setApplied((a) => ({ ...a, [key]: state }));
    return state;
  }

  async function apply(entryId: string, action: AssistantAction) {
    const state = await applyOne(entryId, action);
    if (typeof state === "object" && "done" in state && touchesOpenScreen(action)) reloadEditor({ ...applied, [actionKey(entryId, action)]: state });
  }

  /** Applies every proposal in an answer that hasn't been applied or skipped, in order. */
  async function applyAll(entryId: string, actions: AssistantAction[]) {
    const nextApplied = { ...applied };
    let reload = false;
    for (const action of actions) {
      const key = actionKey(entryId, action);
      const s = applied[key];
      if (s && typeof s === "object" && ("done" in s || "skipped" in s || "undone" in s)) continue;
      const state = await applyOne(entryId, action);
      nextApplied[key] = state;
      if (typeof state === "object" && "done" in state && touchesOpenScreen(action)) reload = true;
    }
    if (reload) reloadEditor(nextApplied);
  }

  function skip(entryId: string, action: AssistantAction, skipped: boolean) {
    const key = actionKey(entryId, action);
    setApplied((a) => {
      const next = { ...a };
      if (skipped) next[key] = { skipped: true };
      else delete next[key];
      return next;
    });
  }

  async function undo(entryId: string, action: AssistantAction) {
    const key = actionKey(entryId, action);
    const state = applied[key];
    if (!state || typeof state !== "object" || !("done" in state)) return;
    setApplied((a) => ({ ...a, [key]: "undoing" }));
    try {
      const result = await undoAssistantAction(siteId, state.undo);
      if (!result.ok) {
        setApplied((a) => ({ ...a, [key]: { ...state, error: friendlyError(result.error) } }));
        return;
      }
      const nextApplied: Record<string, ApplyState> = { ...applied, [key]: { undone: true } };
      setApplied(nextApplied);
      if (touchesOpenScreen(action)) reloadEditor(nextApplied);
    } catch (e) {
      setApplied((a) => ({ ...a, [key]: { ...state, error: friendlyError(e) } }));
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
    if (action.type === "update_profile") return profileHref;
    if (action.type === "add_page") return `${editorBase}/extra-pages/${appliedKey}`;
    if (action.type === "add_blog_post") return `${blogBase}/${appliedKey}`;
    if (action.type === "add_product" || action.type === "update_product" || action.type === "set_stock") return `${shopBase}/products/${appliedKey}`;
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

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 whitespace-pre-line rounded-2xl rounded-br-md bg-koi-ink px-3.5 py-2.5 text-sm text-white">
              {m.content}
              {m.files?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.files.map((f, i) => (
                    <figure key={i} className="w-14">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={`Attached ${KIND_NAMES[f.kind].toLowerCase()}`} className="h-14 w-14 rounded-lg bg-white object-contain" />
                      <figcaption className="mt-0.5 text-center text-[10px] text-white/70">{KIND_NAMES[f.kind]}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div key={m.id} className="mr-4 space-y-2">
              <div
                className={`whitespace-pre-line rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm ${
                  m.error ? "border border-red-200 bg-red-50 text-red-700" : "bg-koi-paper text-koi-ink"
                }`}
              >
                {m.content}
              </div>
              {(m.actions ?? []).length > 1
                ? (() => {
                    const list = m.actions!;
                    const open = list.filter((a) => {
                      const s = applied[actionKey(m.id, a)];
                      return !(s && typeof s === "object" && ("done" in s || "skipped" in s || "undone" in s));
                    });
                    const working = list.some((a) => applied[actionKey(m.id, a)] === "applying");
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-koi-paper/60 px-3 py-2 text-xs text-koi-ink/70">
                        <span>
                          {list.length} changes · tap Skip on any you don&apos;t want
                        </span>
                        {open.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => void applyAll(m.id, list)}
                            disabled={working}
                            className="rounded-full bg-koi-ink px-3 py-1 font-semibold text-white hover:bg-black disabled:opacity-60"
                          >
                            {working ? "Applying…" : `Apply ${open.length === list.length ? "all" : "the rest"} (${open.length})`}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()
                : null}
              {(m.actions ?? []).map((action) => {
                const key = actionKey(m.id, action);
                const state = applied[key];
                const doneState = state && typeof state === "object" && "done" in state ? state : null;
                const done = doneState?.done ?? null;
                const undone = !!state && typeof state === "object" && "undone" in state;
                const skipped = !!state && typeof state === "object" && "skipped" in state;
                const error = state && typeof state === "object" && "error" in state ? state.error : null;
                const changes = changesFor(action);
                const note = noteFor(action);
                const isOpen = expanded[key] ?? false;
                const isProduct = action.type === "add_product" || action.type === "update_product" || action.type === "set_stock";
                const heading =
                  action.type === "add_page"
                    ? "New page"
                    : action.type === "add_blog_post"
                      ? action.post.publish ? "Blog post · publish" : "Blog post · draft"
                    : action.type === "update_profile"
                      ? "Business details"
                      : action.type === "add_product"
                        ? "New product"
                        : action.type === "update_product"
                          ? `Product · ${action.productName}`
                          : action.type === "set_stock"
                            ? `Stock · ${action.productName}`
                            : `${action.pageLabel} page`;
                const live =
                  action.type === "add_blog_post"
                    ? action.post.publish
                    : !isProduct && action.type !== "add_page" && action.type !== "update_profile" && action.pageLive;
                return (
                  <div key={key} className={`rounded-2xl bg-white p-3 ring-1 ring-koi-ink/10 ${skipped ? "opacity-55" : ""}`}>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-koi-ink/45">{heading}</div>
                    <div className="mt-0.5 text-sm font-medium text-koi-ink">{action.summary}</div>

                    {action.type === "add_product" ? (
                      <div className="mt-2 space-y-2 text-xs text-koi-ink/70">
                        <div className="font-semibold text-koi-ink">
                          {formatNaira(action.product.priceKobo)}
                          {action.product.compareAtKobo ? <span className="ml-2 font-normal text-koi-ink/45 line-through">{formatNaira(action.product.compareAtKobo)}</span> : null}
                          {action.product.category ? <span className="ml-2 font-normal text-koi-ink/55">· {action.product.category}</span> : null}
                        </div>
                        {action.product.description ? <p>{action.product.description}</p> : null}
                        {action.product.variants.length ? (
                          <p>
                            {action.product.variants
                              .map((v) => `${Object.values(v.options).join(" / ")}${v.stock !== null ? ` (${v.stock})` : ""}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                        {action.imageOptions.length > 0 && !done && !undone ? (
                          <div>
                            <div className="mb-1 font-medium text-koi-ink/60">Photo — tap to choose</div>
                            <div className="flex flex-wrap gap-2">
                              {action.imageOptions.map((c, ci) => {
                                const on = (picked[key] === undefined ? 0 : picked[key]) === ci;
                                const src = c.thumb;
                                return (
                                  <button
                                    key={c.url}
                                    type="button"
                                    onClick={() => setPicked((x) => ({ ...x, [key]: ci }))}
                                    aria-pressed={on}
                                    title={c.why ?? c.alt}
                                    className={`overflow-hidden rounded-xl ring-2 ${on ? "ring-koi-sea" : "ring-transparent hover:ring-koi-ink/20"}`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt={c.alt} className="h-20 w-20 object-cover" loading="lazy" />
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setPicked((x) => ({ ...x, [key]: null }))}
                                aria-pressed={picked[key] === null}
                                className={`flex h-20 w-20 items-center justify-center rounded-xl bg-koi-paper px-1 text-center text-[11px] ring-2 ${picked[key] === null ? "ring-koi-sea" : "ring-transparent hover:ring-koi-ink/20"}`}
                              >
                                No photo
                              </button>
                            </div>
                            {(() => {
                              const c = action.imageOptions[picked[key] === undefined ? 0 : (picked[key] ?? -1)];
                              return c ? <p className="mt-1 text-[11px] text-koi-ink/50">{c.why ? `${c.why} ` : ""}{c.credit ?? ""}</p> : null;
                            })()}
                          </div>
                        ) : !done && !undone ? (
                          <p className="text-koi-ink/50">No matching photo found. You can add one from the product page after.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {action.type === "add_blog_post" ? (
                      <div className="mt-2 space-y-2 text-xs text-koi-ink/70">
                        <p>{action.post.excerpt}</p>
                        {action.post.tags.length ? <p className="text-koi-ink/50">Tags: {action.post.tags.join(", ")}</p> : null}
                        <button
                          type="button"
                          onClick={() => setExpanded((x) => ({ ...x, [key]: !isOpen }))}
                          className="font-medium text-koi-deep underline underline-offset-2"
                        >
                          {isOpen ? "Hide article" : "Read the article"}
                        </button>
                        {isOpen ? (
                          <div
                            className="max-h-72 overflow-y-auto rounded-xl bg-koi-paper p-3 text-[13px] leading-relaxed text-koi-ink [&_a]:text-koi-deep [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-koi-ink/20 [&_blockquote]:pl-3 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
                            // Sanitised again here; the server already allowlisted the markup.
                            dangerouslySetInnerHTML={{ __html: sanitizePostHtml(action.post.body) }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {note ? <p className="mt-1 text-xs text-koi-ink/60">{note}</p> : null}
                    {done || undone ? null : live ? (
                      <p className="mt-1 text-xs text-amber-700">This page is live — the change shows on your site right away.</p>
                    ) : action.type === "update_profile" ? (
                      <p className="mt-1 text-xs text-amber-700">Shows in the header, footer and contact details across your site.</p>
                    ) : null}
                    {touchesOpenScreen(action) && !done ? (
                      <p className="mt-1 text-xs text-koi-ink/55">Applying reloads this screen — save your own edits first.</p>
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
                      {done || state === "undoing" ? (
                        <>
                          <span className="text-xs font-medium text-emerald-700">✓ Applied</span>
                          {done ? (
                            <Link href={editorHref(action, done)} className="text-xs font-medium text-koi-ink underline underline-offset-2">
                              {action.type === "add_page" ? "Open page" : action.type === "add_blog_post" ? "Open post" : isProduct ? "Open product" : "Open in editor"}
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void undo(m.id, action)}
                            disabled={state === "undoing"}
                            className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-koi-ink ring-1 ring-koi-ink/15 hover:bg-koi-paper disabled:opacity-60"
                          >
                            {state === "undoing" ? "Undoing…" : "Undo"}
                          </button>
                        </>
                      ) : undone ? (
                        <span className="text-xs font-medium text-koi-ink/55">↩ Undone — your previous version is back</span>
                      ) : skipped ? (
                        <>
                          <span className="text-xs font-medium text-koi-ink/55">Skipped</span>
                          <button
                            type="button"
                            onClick={() => skip(m.id, action, false)}
                            className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-koi-ink ring-1 ring-koi-ink/15 hover:bg-koi-paper"
                          >
                            Bring back
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void apply(m.id, action)}
                            disabled={state === "applying"}
                            className="rounded-full bg-koi-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                          >
                            {state === "applying" ? "Applying…" : live ? "Apply to live site" : "Apply"}
                          </button>
                          {(m.actions ?? []).length > 1 && state !== "applying" ? (
                            <button
                              type="button"
                              onClick={() => skip(m.id, action, true)}
                              className="rounded-full px-3 py-1.5 text-xs font-medium text-koi-ink/70 ring-1 ring-koi-ink/15 hover:bg-koi-paper"
                            >
                              Skip
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                    {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
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
        {attached.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-3">
            {attached.map((a) => (
              <div key={a.id} className="w-[72px]">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.preview}
                    alt={`${KIND_NAMES[a.kind]} to send`}
                    className={`h-14 w-[72px] rounded-lg bg-koi-paper object-contain ${a.url ? "" : "opacity-50"}`}
                  />
                  {!a.url && !a.error ? (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-koi-ink">Uploading…</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeAttached(a.id)}
                    aria-label={`Remove ${a.name}`}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-koi-ink text-xs leading-none text-white"
                  >
                    ×
                  </button>
                </div>
                {a.error ? (
                  <p className="mt-1 text-[10px] leading-tight text-red-700">{a.error}</p>
                ) : (
                  <select
                    value={a.kind}
                    onChange={(e) => setAttached((list) => list.map((x) => (x.id === a.id ? { ...x, kind: e.target.value as AttachmentKind } : x)))}
                    aria-label={`What is ${a.name}?`}
                    className="mt-1 w-full rounded-md border border-koi-ink/10 bg-white px-1 py-0.5 text-[11px] text-koi-ink"
                  >
                    {ATTACHMENT_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_NAMES[k]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {attachError ? <p className="mb-2 text-xs text-red-700">{attachError}</p> : null}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void attach(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || outOfRequests || attached.length >= MAX_ATTACHMENTS}
            aria-label="Attach a photo, logo or document"
            title="Attach a photo, logo or document"
            className="h-[44px] rounded-full px-3 text-lg text-koi-ink/60 ring-1 ring-koi-ink/10 hover:bg-koi-paper disabled:opacity-40"
          >
            📎
          </button>
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
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={focusPage ? "e.g. Make this page sound more premium" : "e.g. Add Ankara dress, ₦18,500, sizes M and L, 5 each"}
            disabled={outOfRequests}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-koi-ink/10 bg-white px-3.5 py-2.5 text-sm text-koi-ink outline-none focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || uploading || (!input.trim() && ready.length === 0) || outOfRequests}
            className="rounded-full bg-koi-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
