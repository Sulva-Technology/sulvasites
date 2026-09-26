"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createPresetPages } from "@/lib/extraPages";
import { slugify } from "@/lib/slugify";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";

const templateOptions = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

export default function NewSitePage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [templateKey, setTemplateKey] = useState<(typeof templateOptions)[number]>(
    "t1",
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalSlug = slugify(slug);
    if (!finalSlug) {
      setError("Please enter a business name (or a valid slug).");
      return;
    }

    setIsSaving(true);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();
      const { data, error } = await supabase
        .from("sites")
        .insert({ slug: finalSlug, template_key: templateKey })
        .select("id")
        .single();

      if (error) {
        const msg = formatSupabaseError(error);
        if (
          error.code === "23505" ||
          (msg ?? "").toLowerCase().includes("duplicate key")
        ) {
          setError(
            `That slug is already taken. Try a different one (e.g. "${finalSlug}-2").`,
          );
          return;
        }
        setError(msg);
        return;
      }

      // Seed the template's recommended pages (drafts). Non-fatal: they can be
      // added later from the site page if this fails (e.g. extra_pages missing).
      try {
        await createPresetPages(data.id, templateKey, []);
      } catch (seedErr) {
        console.warn("Could not create recommended pages:", seedErr);
      }

      router.replace(`/admin/sites/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create site</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a new SME site. Pages + profile will be auto-created by the DB.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <label className="block">
          <span className="text-sm font-medium text-gray-800">Business name</span>
          <input
            value={businessName}
            onChange={(e) => {
              const nextName = e.target.value;
              setBusinessName(nextName);
              if (!slugTouched) setSlug(slugify(nextName));
            }}
            placeholder="Kings Bakery"
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-800">Slug</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="kings-bakery"
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            required
          />
          <p className="mt-1 text-xs text-gray-600">
            Preview URL:{" "}
            <span className="font-mono">
              https://{slugify(slug) || "your-slug"}.soothecontrols.site
            </span>
          </p>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-800">Template</span>
          <select
            value={templateKey}
            onChange={(e) =>
              setTemplateKey(e.target.value as (typeof templateOptions)[number])
            }
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          >
            {templateOptions.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "Creating…" : "Create site"}
        </button>
      </form>
    </div>
  );
}

