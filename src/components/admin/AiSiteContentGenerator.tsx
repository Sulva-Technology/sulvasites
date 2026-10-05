"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { runStagedBuild, type BuildProgress, type BuildResult } from "@/lib/ai/assistantClient";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { validatePageData } from "@/lib/pageSchema";

export default function AiSiteContentGenerator({ siteId, templateKey }: { siteId: string; templateKey?: string }) {
  const [brief, setBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [generated, setGenerated] = useState<BuildResult | null>(null);

  const canGenerate = useMemo(() => brief.trim().length > 30, [brief]);

  async function onGenerate() {
    setError(null);
    setSuccess(null);
    setGenerated(null);
    if (!canGenerate) {
      setError("Paste a longer brief first (at least ~30 characters).");
      return;
    }

    setIsGenerating(true);
    try {
      // The site already has a template, so it is kept; the pipeline writes copy that fits it.
      const { result } = await runStagedBuild(
        { messages: [{ role: "user", content: brief.trim().slice(0, 8000) }], templateOverride: templateKey },
        setProgress,
      );
      for (const key of ["home", "about", "contact"] as const) {
        const ok = validatePageData(result.pages[key]);
        if (!ok.ok) throw new Error(ok.error || `Invalid ${key} page output.`);
      }
      setGenerated(result);
      setSuccess("Generated. Review and click Apply to save drafts.");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }

  async function onApply() {
    if (!generated) return;
    setError(null);
    setSuccess(null);
    setIsApplying(true);
    try {
      const supabase = supabaseBrowser();

      // Only overwrite fields the generation produced, so existing contact details are never wiped.
      const p = generated.profile;
      const payload: Record<string, unknown> = { business_name: p.business_name };
      for (const k of ["tagline", "description", "address", "phone", "email", "whatsapp"] as const) {
        if (p[k]) payload[k] = p[k];
      }
      const socials = Object.fromEntries(Object.entries(p.socials).filter(([, v]) => !!v));
      if (Object.keys(socials).length) payload.socials = { instagram: null, facebook: null, twitter: null, tiktok: null, ...socials };

      const { error: profileErr } = await supabase.from("business_profiles").update(payload).eq("site_id", siteId);
      if (profileErr) throw profileErr;

      const updates: Array<Promise<void>> = [];
      for (const key of ["home", "about", "contact"] as const) {
        const data = generated.pages[key];
        const valid = validatePageData(data);
        if (!valid.ok) throw new Error(valid.error || `Invalid ${key} page data.`);

        updates.push((async () => {
          const { error } = await supabase
            .from("pages")
            .update({ data, status: "draft" })
            .eq("site_id", siteId)
            .eq("key", key);
          if (error) throw error;
        })());
      }

      await Promise.all(updates);
      setSuccess("Applied. Pages saved as draft (Home/About/Contact).");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-koi-ink">AI content (optional)</h2>
          <p className="mt-1 text-sm text-koi-ink/60">
            Paste a business brief and generate high-quality content for every section. Works across all templates.
          </p>
        </div>
        <Link
          href={`/admin/sites/${siteId}/preview`}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
        >
          Preview
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={10}
          placeholder="Paste your company details here..."
          className="w-full resize-y rounded border border-koi-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-koi-sea"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className="rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying || !generated}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
          >
            {isApplying ? "Applying…" : "Apply to drafts"}
          </button>

          {isGenerating && progress ? (
            <span role="status" className="text-xs text-koi-ink/60">
              {progress.label} ({Math.min(progress.step, progress.total)}/{progress.total})
            </span>
          ) : generated ? (
            <span className="text-xs text-koi-ink/60">Generated pages: Home/About/Contact.</span>
          ) : null}
        </div>

        {error ? (
          <div className="whitespace-pre-line rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        ) : null}
        {generated && generated.notes.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-koi-ink/60">
            {generated.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}

        {generated ? (
          <details className="rounded border border-koi-ink/10 bg-koi-paper px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-koi-ink">
              Show generated JSON (preview)
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-koi-ink/80">
              {JSON.stringify({ profile: generated.profile, pages: generated.pages, photoCategory: generated.photoCategory }, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}
