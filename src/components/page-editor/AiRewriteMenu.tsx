"use client";

import { useState } from "react";

import type { Section } from "@/lib/pageSchema";
import { diffText, type RewriteAction } from "@/lib/ai/rewrite";
import { ensureSession } from "@/lib/supabase/browser";

const TONES = ["friendly", "formal", "bold", "playful"];

type Proposal = { next: Section; changes: ReturnType<typeof diffText> };

export default function AiRewriteMenu({
  section,
  context,
  onApply,
}: {
  section: Section;
  context?: string;
  onApply: (next: Section) => void;
}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [undo, setUndo] = useState<{ prev: Section; applied: Section } | null>(null);

  if (section.type === "contact_card") return null;

  async function run(action: RewriteAction, option?: string) {
    setOpen(false);
    setError(null);
    setProposal(null);
    setBusy(true);
    try {
      const session = await ensureSession();
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ section, action, option, context }),
      });
      const json = (await res.json().catch(() => null)) as { section?: Section; error?: string } | null;
      if (!res.ok || !json?.section) throw new Error(json?.error ?? "AI rewrite failed.");
      const changes = diffText(section, json.section);
      if (changes.length === 0) {
        setError("AI made no changes. Try another option.");
        return;
      }
      setProposal({ next: json.section, changes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI rewrite failed.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    setUndo({ prev: section, applied: proposal.next });
    onApply(proposal.next);
    setProposal(null);
  }

  const canUndo = !!undo && undo.applied === section;

  const item = "block w-full px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-50";

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {canUndo ? (
          <button
            type="button"
            onClick={() => {
              onApply(undo!.prev);
              setUndo(null);
            }}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Undo AI
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className="rounded bg-white px-2 py-1 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "AI working…" : "AI ▾"}
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded bg-white py-1 shadow-lg ring-1 ring-gray-200">
          <button type="button" className={item} onClick={() => run("rewrite")}>
            Rewrite
          </button>
          <button type="button" className={item} onClick={() => run("shorten")}>
            Shorten
          </button>
          <button type="button" className={item} onClick={() => run("expand")}>
            Expand
          </button>
          <div className="mt-1 border-t border-gray-100 px-3 pt-1.5 text-xs font-medium text-gray-500">Tone</div>
          {TONES.map((t) => (
            <button key={t} type="button" className={item} onClick={() => run("tone", t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div className="mt-1 border-t border-gray-100 px-3 pt-1.5 text-xs font-medium text-gray-500">Translate</div>
          <div className="flex gap-1 px-3 pb-1.5 pt-1">
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Language"
              maxLength={40}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-black"
            />
            <button
              type="button"
              disabled={!language.trim()}
              onClick={() => run("translate", language.trim())}
              className="rounded bg-black px-2 py-1 text-sm text-white disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}{" "}
          <button type="button" className="underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {proposal ? (
        <div className="absolute right-0 z-20 mt-1 w-[min(32rem,90vw)] rounded bg-white p-3 shadow-lg ring-1 ring-gray-300">
          <div className="text-sm font-semibold text-gray-900">
            AI suggestion ({proposal.changes.length} change{proposal.changes.length === 1 ? "" : "s"})
          </div>
          <div className="mt-2 max-h-72 space-y-3 overflow-auto">
            {proposal.changes.map((c) => (
              <div key={c.path} className="text-xs">
                <div className="font-mono text-gray-500">{c.path}</div>
                <div className="mt-0.5 whitespace-pre-wrap break-words text-gray-500 line-through">{c.before}</div>
                <div className="mt-0.5 whitespace-pre-wrap break-words text-gray-900">{c.after}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={apply} className="rounded bg-black px-3 py-1.5 text-sm text-white">
              Apply
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="rounded bg-white px-3 py-1.5 text-sm text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
