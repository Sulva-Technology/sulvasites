"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  runStagedBuild,
  sendChat,
  type BuildProgress,
  type BuildResult,
  type Brief,
  type ChatMessage,
  type SitePlan,
} from "@/lib/ai/assistantClient";
import { createSiteFromBuild } from "@/lib/ai/createSite";
import { slugify } from "@/lib/slugify";
import { TEMPLATE_META, templateLabel } from "@/templates/meta";

const GREETING =
  "Hi, I am the Sulva assistant. Tell me about the business you want a website for: its name, what it does and where it is. One message is enough, and I will pick the template, write the pages and add photos.";

const STARTERS = ["A restaurant or cafe", "A beauty salon", "A clinic", "An online shop"];

type View = { role: "user" | "assistant"; content: string };

export default function SiteAssistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<View[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [ready, setReady] = useState(false);
  const [chips, setChips] = useState<string[]>(STARTERS);
  const [thinking, setThinking] = useState(false);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [doneStages, setDoneStages] = useState<string[]>([]);
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const building = progress !== null;
  const busy = thinking || building || creating;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, progress, result]);

  const transcript = (list: View[]): ChatMessage[] => list.map((m) => ({ role: m.role, content: m.content }));

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    setChips([]);
    const next: View[] = [...messages, { role: "user", content }];
    setMessages(next);
    setThinking(true);
    try {
      // The greeting is UI-only; the model only sees the real conversation.
      const turn = await sendChat(transcript(next.slice(1)), brief);
      setBrief(turn.state);
      setReady(turn.ready);
      setChips(turn.quickReplies);
      if (turn.state.businessName && !slug) setSlug(slugify(turn.state.businessName));
      setMessages([...next, { role: "assistant", content: turn.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setChips([]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function build(override?: string) {
    if (building) return;
    setError(null);
    setResult(null);
    setDoneStages([]);
    setProgress({ stage: "start", label: "Starting…", step: 0, total: 1 });
    try {
      const out = await runStagedBuild(
        {
          messages: transcript(messages.slice(1)),
          state: brief,
          templateOverride: override,
          plan: override && plan ? plan : undefined,
        },
        (p) => {
          setProgress(p);
          setDoneStages((d) => [...d, p.label]);
        },
      );
      setPlan(out.plan);
      setResult(out.result);
      setTemplateKey(out.result.templateKey);
      setSlug((s) => s || out.result.slugSuggestion);
      setMessages((m) => [...m, { role: "assistant", content: "Your site is written. Check the template below, then create it." }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The build failed. Try again.");
    } finally {
      setProgress(null);
    }
  }

  async function create() {
    if (!result || creating) return;
    setCreating(true);
    setError(null);
    try {
      const out = await createSiteFromBuild(result, slug || result.slugSuggestion);
      if (out.warnings.length) console.warn("Site created with warnings:", out.warnings);
      router.replace(`/admin/sites/${out.siteId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the site.");
      setCreating(false);
    }
  }

  const templateChanged = !!result && templateKey !== result.templateKey;
  const hero = result?.pages.home.sections.find((s) => s.type === "hero");

  return (
    <div className="flex flex-col rounded-lg bg-white ring-1 ring-gray-200">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the site assistant"
        className="max-h-[60vh] min-h-[16rem] space-y-3 overflow-y-auto p-4"
      >
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm " +
                (m.role === "user" ? "rounded-br-sm bg-black text-white" : "rounded-bl-sm bg-gray-100 text-gray-900")
              }
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="flex justify-start" role="status">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
              <span className="sr-only">The assistant is typing</span>
              {[0, 150, 300].map((d) => (
                <span key={d} aria-hidden className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : null}

        {building ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm" role="status">
            <p className="font-medium text-gray-900">
              {progress?.label}{" "}
              <span className="font-normal text-gray-500">
                (step {Math.min(progress?.step ?? 0, progress?.total ?? 1)} of {progress?.total})
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-200" aria-hidden>
              <div className="h-full bg-black transition-all" style={{ width: `${Math.round(((progress?.step ?? 0) / (progress?.total || 1)) * 100)}%` }} />
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
              {doneStages.slice(0, -1).map((l, i) => (
                <li key={i}>Done: {l.replace(/…$/, "")}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <section aria-label="Build result" className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Chosen template</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{templateLabel(result.templateKey)}</p>
            <p className="mt-1 text-sm text-gray-700">{result.reason}</p>

            <label className="mt-3 block">
              <span className="text-sm font-medium text-gray-800">Use a different template</span>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                {TEMPLATE_META.map((t) => (
                  <option key={t.key} value={t.key}>
                    {templateLabel(t.key)}
                  </option>
                ))}
              </select>
            </label>
            {templateChanged ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => build(templateKey)}
                  disabled={busy}
                  className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  Rewrite for {TEMPLATE_META.find((t) => t.key === templateKey)?.name}
                </button>
                <span className="text-xs text-gray-600">Pages are written per template, so rewrite before creating.</span>
              </div>
            ) : null}

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Business</dt>
                <dd className="text-gray-900">{result.profile.business_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Tagline</dt>
                <dd className="text-gray-900">{result.profile.tagline ?? "None"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">Home headline</dt>
                <dd className="text-gray-900">{hero && hero.type === "hero" ? hero.headline : "None"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">Pages (saved as drafts)</dt>
                <dd className="text-gray-900">Home, About, Contact{result.extraPages.map((p) => `, ${p.label}`).join("")}</dd>
              </div>
            </dl>

            {result.notes.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}

            <label className="mt-4 block">
              <span className="text-sm font-medium text-gray-800">Site address</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={creating}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
              <span className="mt-1 block text-xs text-gray-600">
                Preview URL: <span className="font-mono">https://{slugify(slug) || "your-slug"}.soothecontrols.site</span>. A number is added if it is taken.
              </span>
            </label>

            <button
              type="button"
              onClick={create}
              disabled={busy || templateChanged || !slugify(slug)}
              className="mt-4 w-full rounded bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
            >
              {creating ? "Creating…" : "Create site"}
            </button>
          </section>
        ) : null}

        {error ? (
          <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="border-t border-gray-200 p-3">
        {!result && ready && !building ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => build()}
              disabled={busy}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Build my site
            </button>
            <span className="text-xs text-gray-600">Or add more details below first.</span>
          </div>
        ) : null}

        {chips.length > 0 && !busy ? (
          <div className="mb-2 flex flex-wrap gap-2" aria-label="Quick replies">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => (/^skip/i.test(c) && ready ? build() : send(c))}
                className="rounded-full bg-white px-3 py-1.5 text-sm text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">Your message</span>
            <textarea
              ref={inputRef}
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
              placeholder="e.g. Kings Bakery in Lagos. We bake bread and custom cakes. Call 0803…"
              className="w-full resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              disabled={creating || building}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
