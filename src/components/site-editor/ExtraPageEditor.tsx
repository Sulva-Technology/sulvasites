"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AiRewriteMenu from "@/components/page-editor/AiRewriteMenu";
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
  defaultSection,
  validatePageData,
  type PageData,
  type Section,
} from "@/lib/pageSchema";
import {
  getExtraPageByKey,
  publishExtraPage,
  saveExtraPageDraft,
  unpublishExtraPage,
  type ExtraPageRow,
} from "@/lib/extraPages";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import type { SiteEditorProps } from "./types";

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

export default function ExtraPageEditor({ siteId, pageKey: key = "", mode, basePath }: SiteEditorProps) {
  const [pageRow, setPageRow] = useState<ExtraPageRow | null>(null);
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

  useEffect(() => {
    if (!siteId || !key) return;
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      setSaveSuccess(false);
      setPublishSuccess(false);
      setUnpublishSuccess(false);
      setSaveError(null);
      setRawError(null);

      try {
        const row = await getExtraPageByKey(siteId, key);
        if (!row) {
          setLoadError("Extra page not found (create it first on Site overview).");
          return;
        }

        const valid = validatePageData(row.data);
        const seed = valid.ok ? (row.data as PageData) : ({ seo: { title: "", description: "" }, sections: [] } as PageData);

        if (!isMounted) return;
        setPageRow(row);
        setPageDraft(seed);
        setRawText(JSON.stringify(seed, null, 2));
      } catch (err) {
        if (!isMounted) return;
        setLoadError(formatSupabaseError(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [siteId, key]);

  const sections = pageDraft?.sections ?? [];

  const isPublished = pageRow?.status === "published";

  const canPublish = useMemo(() => {
    if (!pageDraft) return false;
    const valid = validatePageData(pageDraft);
    return valid.ok;
  }, [pageDraft]);

  if (!siteId || !key) {
    return <div>Loading...</div>;
  }

  // The AI routes (/api/ai/*) are Sulvatech-admin only, so owners do not see the AI controls.
  const showAi = mode === "admin";

  function updateSection(index: number, next: Section) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections.map((s, i) => (i === index ? next : s));
      const nextDraft = { ...prev, sections: nextSections };
      setRawText(JSON.stringify(nextDraft, null, 2));
      return nextDraft;
    });
  }

  function addSection(type: Section["type"]) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      const nextDraft = { ...prev, sections: [...prev.sections, defaultSection(type)] };
      setRawText(JSON.stringify(nextDraft, null, 2));
      return nextDraft;
    });
  }

  function removeSection(index: number) {
    setPageDraft((prev) => {
      if (!prev) return prev;
      const nextDraft = { ...prev, sections: prev.sections.filter((_, i) => i !== index) };
      setRawText(JSON.stringify(nextDraft, null, 2));
      return nextDraft;
    });
  }

  async function onSaveDraft() {
    if (!pageRow || !pageDraft) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);

    try {
      await saveExtraPageDraft(pageRow.id, pageDraft);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(formatSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function onPublish() {
    if (!pageRow || !pageDraft) return;
    if (!canPublish) {
      setSaveError("Fix validation errors before publishing.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);

    try {
      const updated = await publishExtraPage(pageRow.id, pageDraft);
      setPageRow(updated);
      setPublishSuccess(true);
    } catch (err) {
      setSaveError(formatSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function onUnpublish() {
    if (!pageRow) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setPublishSuccess(false);
    setUnpublishSuccess(false);

    try {
      const updated = await unpublishExtraPage(pageRow.id);
      setPageRow(updated);
      setUnpublishSuccess(true);
    } catch (err) {
      setSaveError(formatSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="text-sm text-koi-ink/60">Loading…</div>;
  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }
  if (!pageRow || !pageDraft) {
    return <div className="text-sm text-koi-ink/75">Extra page not found.</div>;
  }

  return (
    <SiteImageProvider siteId={siteId}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-koi-ink">Extra page: {pageRow.key}</h1>
          <div className="mt-1 text-sm text-koi-ink/60">
            Status: <span className="font-medium text-koi-ink">{pageRow.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={basePath}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
          >
            {isSaving ? "Working…" : "Save draft"}
          </button>
          {isPublished ? (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={isSaving}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={onPublish}
              disabled={isSaving || !canPublish}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("form")}
          className={`rounded px-3 py-1.5 text-sm font-medium ring-1 ring-koi-ink/10 ${tab === "form" ? "bg-black text-white" : "bg-white text-koi-ink"}`}
        >
          Form
        </button>
        <button
          type="button"
          onClick={() => setTab("raw")}
          className={`rounded px-3 py-1.5 text-sm font-medium ring-1 ring-koi-ink/10 ${tab === "raw" ? "bg-black text-white" : "bg-white text-koi-ink"}`}
        >
          Raw JSON
        </button>
      </div>

      {saveError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}
      {saveSuccess ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Saved.
        </div>
      ) : null}
      {publishSuccess ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Published.
        </div>
      ) : null}
      {unpublishSuccess ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Unpublished.
        </div>
      ) : null}

      {tab === "raw" ? (
        <div className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={18}
            className="w-full rounded border border-koi-ink/15 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-koi-sea"
          />
          {rawError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {rawError}
            </div>
          ) : null}
          <button
            type="button"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
            onClick={() => {
              setRawError(null);
              try {
                const parsed = JSON.parse(rawText) as unknown;
                const valid = validatePageData(parsed);
                if (!valid.ok) {
                  setRawError(valid.error ?? "Invalid JSON structure.");
                  return;
                }
                setPageDraft(parsed as PageData);
              } catch (e) {
                setRawError(e instanceof Error ? e.message : "Invalid JSON.");
              }
            }}
          >
            Apply JSON
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-koi-ink">Sections</div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
                  onChange={(e) => {
                    const v = e.target.value as Section["type"];
                    if (!v) return;
                    addSection(v);
                    e.currentTarget.value = "";
                  }}
                  defaultValue=""
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
          </div>

          {sections.length === 0 ? (
            <div className="text-sm text-koi-ink/60">No sections yet.</div>
          ) : null}

          {sections.map((section, idx) => (
            <div key={`${section.type}-${idx}`} className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-koi-ink">{section.type}</div>
                <div className="flex items-center gap-3">
                  {showAi ? (
                    <AiRewriteMenu
                      section={section}
                      onApply={(next) => updateSection(idx, next)}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {section.type === "hero" && (
                <HeroEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "services" && (
                <ServicesEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "richtext" && (
                <RichTextEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "values" && (
                <ValuesEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "contact_card" && (
                <ContactCardEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "backed_by" && (
                <BackedByEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "use_cases" && (
                <UseCasesEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "gallery" && (
                <GalleryEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "testimonials" && (
                <TestimonialsEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "faq" && (
                <FAQEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
              {section.type === "team" && (
                <TeamEditor
                  value={section}
                  onChange={(next) => updateSection(idx, next)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </SiteImageProvider>
  );
}

