"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { ensureSession, supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { validatePageData, type PageData } from "@/lib/pageSchema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

type Generated = {
  profile: {
    business_name?: string;
    tagline?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    socials?: {
      instagram?: string | null;
      facebook?: string | null;
      twitter?: string | null;
      tiktok?: string | null;
    } | null;
  } | null;
  pages: {
    home: PageData;
    about: PageData;
    contact: PageData;
  };
};

export default function AiSiteContentGenerator({ siteId }: { siteId: string }) {
  const [brief, setBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Generated | null>(null);

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
      const endpoint = "/api/ai/generate-site-groq";

      const session = await ensureSession();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ brief }),
      });
      const json = (await res.json()) as unknown;
      if (!res.ok) {
        const msg =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : "AI generation failed.";
        throw new Error(msg);
      }

      if (!isRecord(json) || !isRecord(json.pages)) {
        throw new Error("Invalid AI response.");
      }

      const pages = json.pages as Record<string, unknown>;
      const homeOk = validatePageData(pages.home);
      const aboutOk = validatePageData(pages.about);
      const contactOk = validatePageData(pages.contact);
      if (!homeOk.ok) throw new Error(homeOk.error || "Invalid home page output.");
      if (!aboutOk.ok) throw new Error(aboutOk.error || "Invalid about page output.");
      if (!contactOk.ok) throw new Error(contactOk.error || "Invalid contact page output.");

      setGenerated(json as unknown as Generated);
      setSuccess("Generated. Review and click Apply to save drafts.");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setIsGenerating(false);
    }
  }

  async function onApply() {
    if (!generated) return;
    setError(null);
    setSuccess(null);
    setIsApplying(true);
    try {
      const supabase = supabaseBrowser();

      if (generated.profile) {
        const p = generated.profile;
        const payload = {
          business_name: (p.business_name ?? "").trim() || null,
          tagline: (p.tagline ?? null) ? String(p.tagline).trim() || null : null,
          description: (p.description ?? null) ? String(p.description).trim() || null : null,
          address: (p.address ?? null) ? String(p.address).trim() || null : null,
          phone: (p.phone ?? null) ? String(p.phone).trim() || null : null,
          email: (p.email ?? null) ? String(p.email).trim() || null : null,
          whatsapp: (p.whatsapp ?? null) ? String(p.whatsapp).trim() || null : null,
          socials: {
            instagram: p.socials?.instagram ?? null,
            facebook: p.socials?.facebook ?? null,
            twitter: p.socials?.twitter ?? null,
            tiktok: p.socials?.tiktok ?? null,
          },
        };

        const { error: profileErr } = await supabase
          .from("business_profiles")
          .update(payload)
          .eq("site_id", siteId);
        if (profileErr) throw profileErr;
      }

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
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AI content (optional)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste a business brief and generate high-quality content for every section. Works across all templates.
          </p>
        </div>
        <Link
          href={`/admin/sites/${siteId}/preview`}
          className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
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
          className="w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying || !generated}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            {isApplying ? "Applying…" : "Apply to drafts"}
          </button>

          {generated ? (
            <span className="text-xs text-gray-600">
              Generated pages: Home/About/Contact.
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="whitespace-pre-line rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        ) : null}

        {generated ? (
          <details className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-900">
              Show generated JSON (preview)
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-800">
              {JSON.stringify(generated, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}

