"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ContactCardEditor from "@/components/page-editor/ContactCardEditor";
import HeroEditor from "@/components/page-editor/HeroEditor";
import RichTextEditor from "@/components/page-editor/RichTextEditor";
import ServicesEditor from "@/components/page-editor/ServicesEditor";
import ValuesEditor from "@/components/page-editor/ValuesEditor";
import BackedByEditor from "@/components/page-editor/BackedByEditor";
import UseCasesEditor from "@/components/page-editor/UseCasesEditor";
import GalleryEditor from "@/components/page-editor/GalleryEditor";
import TestimonialsEditor from "@/components/page-editor/TestimonialsEditor";
import FAQEditor from "@/components/page-editor/FAQEditor";
import TeamEditor from "@/components/page-editor/TeamEditor";
import { SiteImageProvider } from "@/components/page-editor/ImageField";
import {
  defaultPageData,
  defaultSection,
  isPageKey,
  validatePageData,
  type PageData,
  type PageKey,
  type Section,
} from "@/lib/pageSchema";
import { publishPage, unpublishPage } from "@/lib/publishing";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";

type PagesRow = {
  id: string;
  site_id: string;
  key: PageKey;
  status: string;
  data: unknown;
  updated_at: string;
  published_at: string | null;
};

const sectionOptions: Array<Section["type"]> = [
  "hero",
  "services",
  "richtext",
  "values",
  "contact_card",
  "backed_by",
  "use_cases",
  "gallery",
  "testimonials",
  "faq",
  "team",
];

export default function PageEditorPage() {
  const params = useParams();
  const siteId = typeof params?.siteId === "string" ? params.siteId : "";
  const key = typeof params?.key === "string" ? params.key : "";
  const pageKey: PageKey | null = isPageKey(key) ? key : null;

  const [pageRow, setPageRow] = useState<PagesRow | null>(null);
  const [pageDraft, setPageDraft] = useState<PageData | null>(null);

  const [tab, setTab] = useState<"form" | "raw">("form");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rawText, setRawText] = useState("");
  const [rawError, setRawError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [unpublishSuccess, setUnpublishSuccess] = useState(false);

  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId || !pageKey) return;
    let isMounted = true;
    const supabase = supabaseBrowser();
    const pk = pageKey;

    async function load(keyForLoad: PageKey) {
      setIsLoading(true);
      setLoadError(null);
      setSaveSuccess(false);
      setPublishSuccess(false);
      setUnpublishSuccess(false);
      setSaveError(null);
      setRawError(null);
      setSeedNotice(null);

      let authenticatedSupabase;
      try {
        // Ensure client is fully authenticated before making database call
        authenticatedSupabase = await getAuthenticatedClient();
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setLoadError(err instanceof Error ? err.message : "Session error. Please log in again.");
        return;
      }

      const { data, error } = await authenticatedSupabase
        .from("pages")
        .select("*")
        .eq("site_id", siteId)
        .eq("key", pageKey)
        .single();

      if (!isMounted) return;
      setIsLoading(false);

      if (error) {
        setLoadError(formatSupabaseError(error));
        return;
      }

      const row = data as PagesRow;
      setPageRow(row);

      const isEmptyObject =
        row.data &&
        typeof row.data === "object" &&
        !Array.isArray(row.data) &&
        Object.keys(row.data as Record<string, unknown>).length === 0;

      if (!row.data || isEmptyObject) {
        const seeded = defaultPageData(keyForLoad);
        setPageDraft(seeded);
        setRawText(JSON.stringify(seeded, null, 2));
        setSeedNotice(
          "This page had no content yet. Defaults were loaded into the editor (not saved until you click Save Draft).",
        );
        return;
      }

      const valid = validatePageData(row.data);
      if (!valid.ok) {
        const seeded = defaultPageData(keyForLoad);
        setPageDraft(seeded);
        setRawText(JSON.stringify(seeded, null, 2));
        setSeedNotice(
          `Stored JSON was invalid (${valid.error}). Defaults were loaded into the editor (not saved until you click Save Draft).`,
        );
        return;
      }

      setPageDraft(row.data as PageData);
      setRawText(JSON.stringify(row.data, null, 2));
    }

    load(pk);

    return () => {
      isMounted = false;
    };
  }, [siteId, pageKey]);

  const headerMeta = useMemo(() => {
    if (!pageRow) return null;
    return {
      updatedAt: new Date(pageRow.updated_at).toLocaleString(),
      publishedAt: pageRow.published_at
        ? new Date(pageRow.published_at).toLocaleString()
        : null,
    };
  }, [pageRow]);

  function setSeo(patch: Partial<PageData["seo"]>) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, seo: { ...prev.seo, ...patch } };
    });
  }

  function updateSection(idx: number, next: Section) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, i) => (i === idx ? next : s));
      return { ...prev, sections };
    });
  }

  function addSection(type: Section["type"]) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: [...prev.sections, defaultSection(type)] };
    });
  }

  function removeSection(idx: number) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: prev.sections.filter((_, i) => i !== idx) };
    });
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.sections];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return { ...prev, sections: next };
    });
  }

  function syncRawFromDraft(nextDraft: PageData) {
    setRawText(JSON.stringify(nextDraft, null, 2));
    setRawError(null);
  }

  useEffect(() => {
    // Keep raw JSON view aligned when editing via form (unless user has invalid raw edits)
    if (!pageDraft) return;
    if (tab !== "raw") return;
    if (rawError) return;
    setRawText(JSON.stringify(pageDraft, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageDraft, tab]);

  function onRawChange(nextText: string) {
    setRawText(nextText);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const parsed = JSON.parse(nextText) as unknown;
      const valid = validatePageData(parsed);
      if (!valid.ok) {
        setRawError(valid.error ?? "Invalid JSON structure.");
        return;
      }
      setRawError(null);
      setPageDraft(parsed as PageData);
    } catch {
      setRawError("Invalid JSON (must be valid JSON with { seo: object, sections: array }).");
    }
  }

  async function onSaveDraft() {
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);
    setSaveError(null);

    if (!pageRow || !pageDraft) return;

    if (rawError) {
      setSaveError("Cannot save while Raw JSON is invalid.");
      return;
    }

    const valid = validatePageData(pageDraft);
    if (!valid.ok) {
      setSaveError(valid.error ?? "Invalid JSON structure.");
      return;
    }

    setIsSaving(true);
    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();

      const { error } = await supabase
        .from("pages")
        .update({ data: pageDraft, status: "draft" })
        .eq("id", pageRow.id);

      if (error) {
        setSaveError(formatSupabaseError(error));
        return;
      }

      setSaveSuccess(true);
      setSeedNotice(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onPublishPage() {
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);
    setSaveError(null);

    if (!pageRow || !pageDraft) return;

    if (rawError) {
      setSaveError("Cannot publish while Raw JSON is invalid.");
      return;
    }

    const valid = validatePageData(pageDraft);
    if (!valid.ok) {
      setSaveError(valid.error ?? "Invalid JSON structure.");
      return;
    }

    setIsSaving(true);
    try {
      // publishPage already ensures authentication
      const updated = await publishPage(pageRow.id, pageDraft);
      setPageRow((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              published_at: updated.published_at,
              updated_at: updated.updated_at,
            }
          : prev,
      );
      setPublishSuccess(true);
      setSeedNotice(null);
    } catch (err) {
      setSaveError(formatSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function onUnpublishPage() {
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);
    setSaveError(null);

    if (!pageRow) return;
    if (!window.confirm("Unpublish this page?")) return;

    setIsSaving(true);
    try {
      // unpublishPage already ensures authentication
      const updated = await unpublishPage(pageRow.id);
      setPageRow((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              published_at: updated.published_at,
              updated_at: updated.updated_at,
            }
          : prev,
      );
      setUnpublishSuccess(true);
    } catch (err) {
      setSaveError(formatSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  function onResetDefaults() {
    if (!pageKey) return;
    if (!window.confirm("Reset this page to default sections?")) return;
    const next = defaultPageData(pageKey);
    setPageDraft(next);
    syncRawFromDraft(next);
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);
    setSaveError(null);
    setSeedNotice("Defaults loaded. Click Save Draft to persist.");
  }

  if (!siteId || !key) {
    return <div>Loading...</div>;
  }

  if (!pageKey) notFound();

  return (
    <SiteImageProvider siteId={siteId}>
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            Edit page: <span className="font-mono">{pageKey}</span>
          </h1>
          <div className="mt-2 text-sm text-gray-700">
            <div>
              <span className="font-medium">Site:</span>{" "}
              <span className="font-mono">{siteId}</span>
            </div>
            {pageRow && headerMeta ? (
              <div className="mt-1 space-y-0.5">
                <div>
                  <span className="font-medium">Status:</span> {pageRow.status}
                </div>
                <div>
                  <span className="font-medium">Updated:</span>{" "}
                  {headerMeta.updatedAt}
                </div>
                {headerMeta.publishedAt ? (
                  <div>
                    <span className="font-medium">Published:</span>{" "}
                    {headerMeta.publishedAt}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/admin/sites/${siteId}`}
            className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Back to site overview
          </Link>
          <button
            type="button"
            onClick={onResetDefaults}
            className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : loadError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {seedNotice ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {seedNotice}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("form")}
          className={`rounded px-3 py-2 text-sm font-medium ring-1 ${
            tab === "form"
              ? "bg-black text-white ring-black"
              : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
          }`}
        >
          Form Editor
        </button>
        <button
          type="button"
          onClick={() => setTab("raw")}
          className={`rounded px-3 py-2 text-sm font-medium ring-1 ${
            tab === "raw"
              ? "bg-black text-white ring-black"
              : "bg-white text-gray-900 ring-gray-200 hover:bg-gray-50"
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Content */}
      {pageDraft ? (
        <div className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
          {tab === "form" ? (
            <div className="space-y-6">
              {/* SEO */}
              <div>
                <h2 className="text-lg font-semibold">SEO</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-800">
                      Title
                    </span>
                    <input
                      value={pageDraft.seo.title}
                      onChange={(e) => setSeo({ title: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-800">
                      Description
                    </span>
                    <input
                      value={pageDraft.seo.description}
                      onChange={(e) => setSeo({ description: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold">Sections</h2>
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const t = e.target.value as Section["type"];
                        if (!t) return;
                        addSection(t);
                        e.target.value = "";
                      }}
                      className="rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    >
                      <option value="" disabled>
                        Add section…
                      </option>
                      {sectionOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {pageDraft.sections.length === 0 ? (
                  <div className="text-sm text-gray-600">No sections.</div>
                ) : (
                  <div className="space-y-4">
                    {pageDraft.sections.map((section, idx) => (
                      <div
                        key={`${section.type}-${idx}`}
                        className="rounded border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {idx + 1}. {section.type}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveSection(idx, -1)}
                              disabled={idx === 0}
                              className="rounded bg-white px-2 py-1 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 1)}
                              disabled={idx === pageDraft.sections.length - 1}
                              className="rounded bg-white px-2 py-1 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSection(idx)}
                              className="text-sm font-medium text-red-700 hover:underline"
                            >
                              Remove section
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          {section.type === "hero" ? (
                            <HeroEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "services" ? (
                            <ServicesEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "richtext" ? (
                            <RichTextEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "values" ? (
                            <ValuesEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "contact_card" ? (
                            <ContactCardEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "backed_by" ? (
                            <BackedByEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "use_cases" ? (
                            <UseCasesEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "gallery" ? (
                            <GalleryEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "testimonials" ? (
                            <TestimonialsEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "faq" ? (
                            <FAQEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : section.type === "team" ? (
                            <TeamEditor
                              value={section}
                              onChange={(next) => updateSection(idx, next)}
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Edit the JSON directly. Must be valid JSON with{" "}
                <span className="font-mono">{"{ seo: object, sections: array }"}</span>.
              </p>
              <textarea
                value={rawText}
                onChange={(e) => onRawChange(e.target.value)}
                rows={18}
                className="w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-black"
              />
              {rawError ? (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {rawError}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* Save */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {saveError ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}
          {saveSuccess ? (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Draft saved.
            </div>
          ) : null}
          {publishSuccess ? (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Page published.
            </div>
          ) : null}
          {unpublishSuccess ? (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Page unpublished.
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pageRow?.status === "published" ? (
            <button
              type="button"
              onClick={onUnpublishPage}
              disabled={isSaving}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
            >
              {isSaving ? "Working…" : "Unpublish Page"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || !!rawError || !pageDraft}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={onPublishPage}
            disabled={isSaving || !!rawError || !pageDraft}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "Publishing…" : "Publish Page"}
          </button>
        </div>
      </div>
    </div>
    </SiteImageProvider>
  );
}

