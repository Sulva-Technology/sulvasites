"use client";

import { useState } from "react";

import { applySeoChanges, listSeoChanges, type SeoChange, type SeoPageInput, type SeoProfile } from "@/lib/ai/seo";
import type { PageData } from "@/lib/pageSchema";
import { ensureSession } from "@/lib/supabase/browser";

type Loaded = { pages: SeoPageInput[]; profile?: SeoProfile };

export default function AiSeoButton({
  label,
  load,
  onApply,
  appliedNote = "",
}: {
  label: string;
  /** Called on click so the latest page data (and business profile) is used. */
  load: () => Promise<Loaded>;
  /** Receives the updated data for every page that has at least one accepted change. */
  onApply: (updated: Record<string, PageData>) => Promise<void> | void;
  /** Appended to the success message, e.g. "Save the draft to keep them." */
  appliedNote?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<{ pages: SeoPageInput[]; changes: SeoChange[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function generate() {
    setError(null);
    setNotice(null);
    setSession(null);
    setBusy(true);
    try {
      const { pages, profile } = await load();
      const auth = await ensureSession();
      const res = await fetch("/api/ai/seo", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${auth.access_token}` },
        body: JSON.stringify({ pages, profile }),
      });
      const json = (await res.json().catch(() => null)) as { pages?: Record<string, PageData>; error?: string } | null;
      if (!res.ok || !json?.pages) throw new Error(json?.error ?? "AI SEO failed.");

      const changes = pages.flatMap((p) => (json.pages![p.key] ? listSeoChanges(p.key, p.data, json.pages![p.key]) : []));
      if (changes.length === 0) {
        setNotice("Nothing to improve: AI suggested no changes.");
        return;
      }
      setSession({ pages, changes });
      setSelected(new Set(changes.map((c) => c.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI SEO failed.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!session) return;
    const chosen = session.changes.filter((c) => selected.has(c.id));
    if (chosen.length === 0) {
      setSession(null);
      return;
    }
    const updated: Record<string, PageData> = {};
    for (const p of session.pages) {
      const mine = chosen.filter((c) => c.pageKey === p.key);
      if (mine.length) updated[p.key] = applySeoChanges(p.data, mine);
    }
    setApplying(true);
    setError(null);
    try {
      await onApply(updated);
      setNotice(`Applied ${chosen.length} change${chosen.length === 1 ? "" : "s"}.${appliedNote ? ` ${appliedNote}` : ""}`);
      setSession(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply changes.");
    } finally {
      setApplying(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy || applying}
          className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "AI working…" : label}
        </button>
        {notice ? <span className="text-sm text-green-800">{notice}</span> : null}
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {session ? (
        <div className="rounded border border-gray-300 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">
            AI suggestions: {selected.size} of {session.changes.length} selected
          </div>
          <div className="mt-3 max-h-96 space-y-3 overflow-auto">
            {session.changes.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-gray-500">
                    {session.pages.length > 1 ? `${c.pageKey} · ` : ""}
                    {c.label}
                    {c.field !== "alt" ? ` (${c.after.length} chars)` : ""}
                  </span>
                  {c.before ? (
                    <span className="block break-words text-gray-500 line-through">{c.before}</span>
                  ) : (
                    <span className="block italic text-gray-400">(empty)</span>
                  )}
                  <span className="block break-words text-gray-900">{c.after}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {applying ? "Applying…" : "Apply selected"}
            </button>
            <button
              type="button"
              onClick={() => setSession(null)}
              disabled={applying}
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
