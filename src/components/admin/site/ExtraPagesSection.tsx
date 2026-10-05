"use client";

import Link from "next/link";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";

import { createExtraPage, createPresetPages, type ExtraPageRow } from "@/lib/extraPages";
import { defaultPageData } from "@/lib/pageSchema";
import { slugify } from "@/lib/slugify";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { getPagePresets } from "@/templates/pagePresets";

const RESERVED_KEYS = ["home", "about", "contact", "p"];

export default function ExtraPagesSection({
  siteId,
  siteSlug,
  templateKey,
  platformDomain,
  extraPages,
  setExtraPages,
  editBasePath,
}: {
  siteId: string;
  siteSlug: string;
  templateKey: string;
  platformDomain: string;
  extraPages: ExtraPageRow[];
  setExtraPages: Dispatch<SetStateAction<ExtraPageRow[]>>;
  /** Prefix for the Edit links; defaults to the admin editor route. */
  editBasePath?: string;
}) {
  const [newExtraKey, setNewExtraKey] = useState("");
  const [extraError, setExtraError] = useState<string | null>(null);
  const [isCreatingExtra, setIsCreatingExtra] = useState(false);

  const existingKeys = extraPages.map((p) => p.key);
  const missingPresets = getPagePresets(templateKey).filter((p) => !existingKeys.includes(p.key));

  async function onAddRecommended() {
    setExtraError(null);
    setIsCreatingExtra(true);
    try {
      const created = await createPresetPages(siteId, templateKey, existingKeys);
      setExtraPages((prev) => [...created, ...prev]);
    } catch (err) {
      setExtraError(formatSupabaseError(err));
    } finally {
      setIsCreatingExtra(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setExtraError(null);

    const key = slugify(newExtraKey.trim());
    if (!key) {
      setExtraError("Please enter a valid page key (e.g. pricing).");
      return;
    }
    if (RESERVED_KEYS.includes(key)) {
      setExtraError(`"${key}" is reserved. Choose another key.`);
      return;
    }

    setIsCreatingExtra(true);
    try {
      // Keep the SEO blank by default; editors can fill it later.
      const created = await createExtraPage(siteId, key, defaultPageData("home"));
      setExtraPages((prev) => [created, ...prev]);
      setNewExtraKey("");
    } catch (err) {
      setExtraError(formatSupabaseError(err));
    } finally {
      setIsCreatingExtra(false);
    }
  }

  return (
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold">Extra pages</h2>
      <p className="mt-1 text-sm text-gray-600">
        Create additional pages for this specific site (not template-wide). URLs will be:
        <span className="ml-2 font-mono text-xs">
          https://{siteSlug}.{platformDomain}/p/&lt;key&gt;
        </span>
      </p>

      <p className="mt-2 text-sm text-gray-600">
        Published extra pages appear in the site&apos;s navigation automatically.
      </p>

      {missingPresets.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-blue-900">
            <div className="font-medium">Recommended pages for this template</div>
            <div className="mt-0.5">{missingPresets.map((p) => p.label).join(" · ")}</div>
          </div>
          <button
            type="button"
            onClick={onAddRecommended}
            disabled={isCreatingExtra}
            className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isCreatingExtra ? "Adding…" : "Add as drafts"}
          </button>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={newExtraKey}
          onChange={(e) => setNewExtraKey(e.target.value)}
          placeholder="pricing"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={isCreatingExtra || !newExtraKey.trim()}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isCreatingExtra ? "Creating…" : "Create page"}
        </button>
      </form>

      {extraError ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {extraError}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-gray-200">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {extraPages.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-600" colSpan={4}>
                  No extra pages yet.
                </td>
              </tr>
            ) : (
              extraPages.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono">{p.key}</td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${editBasePath ?? `/admin/sites/${siteId}/extra-pages`}/${p.key}`}
                      className="text-sm font-medium text-black underline underline-offset-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
