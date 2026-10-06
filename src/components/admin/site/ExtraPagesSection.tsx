"use client";

import Link from "next/link";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";

import { StatusPill } from "@/components/ui/StatusPill";
import { createExtraPage, createPresetPages, type ExtraPageRow } from "@/lib/extraPages";
import { slugify } from "@/lib/slugify";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import {
  BLANK_STARTER,
  PAGE_STARTERS,
  RESERVED_PAGE_KEYS,
  buildPresetPageData,
  describeSections,
  getPageIdeas,
  labelForPageKey,
  sortPageKeys,
  uniquePageKey,
  type PagePreset,
} from "@/templates/pagePresets";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customLayout, setCustomLayout] = useState(BLANK_STARTER.key);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const editBase = editBasePath ?? `/admin/sites/${siteId}/extra-pages`;
  const siteUrl = `https://${siteSlug}.${platformDomain}`;
  const existingKeys = extraPages.map((p) => p.key);
  const ideas = getPageIdeas(templateKey, existingKeys);
  const missingRecommended = ideas.filter((i) => i.recommended);
  const byKey = new Map(extraPages.map((p) => [p.key, p]));
  const sortedPages = sortPageKeys(templateKey, existingKeys).map((k) => byKey.get(k)!);

  const customKey = slugify(customName.trim());
  const customReserved = RESERVED_PAGE_KEYS.includes(customKey);
  const customFinalKey = customKey && !customReserved ? uniquePageKey(customKey, existingKeys) : "";

  function added(rows: ExtraPageRow[]) {
    setExtraPages((prev) => [...rows, ...prev]);
    setJustAdded(rows.map((r) => r.key));
  }

  async function addPage(preset: PagePreset, key: string, busy: string) {
    setError(null);
    setBusyKey(busy);
    try {
      added([await createExtraPage(siteId, key, buildPresetPageData(preset))]);
      return true;
    } catch (err) {
      setError(formatSupabaseError(err));
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function onAddAllRecommended() {
    setError(null);
    setBusyKey("__all__");
    try {
      added(await createPresetPages(siteId, templateKey, existingKeys));
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function onCreateCustom(e: FormEvent) {
    e.preventDefault();
    const name = customName.trim();
    if (!customKey) {
      setError("Give your page a name using letters or numbers, e.g. “Pricing”.");
      return;
    }
    if (customReserved) {
      setError(`Your site already has a “${name}” page built in — edit it in the main pages list.`);
      return;
    }
    const layout = PAGE_STARTERS.find((s) => s.key === customLayout) ?? BLANK_STARTER;
    const ok = await addPage({ ...layout, label: name, headline: name }, customFinalKey, "__custom__");
    if (ok) setCustomName("");
  }

  const busy = busyKey !== null;

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-koi-ink">More pages</h2>
          <p className="mt-1 text-sm text-koi-ink/60">
            Pages beyond Home, About and Contact. New pages start as hidden drafts — they appear in your
            site&apos;s menu once you publish them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          className="shrink-0 rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
        >
          {pickerOpen ? "Close" : "+ Add a page"}
        </button>
      </div>

      {missingRecommended.length > 0 && !pickerOpen ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-blue-900">
            <div className="font-medium">Your template was designed with these pages</div>
            <div className="mt-0.5">{missingRecommended.map((p) => p.label).join(" · ")}</div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-full px-4 py-2 text-sm font-medium text-blue-900 ring-1 ring-blue-300 hover:bg-white"
            >
              Choose
            </button>
            <button
              type="button"
              onClick={onAddAllRecommended}
              disabled={busy}
              className="rounded-full bg-koi-sea px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busyKey === "__all__" ? "Adding…" : `Add all ${missingRecommended.length}`}
            </button>
          </div>
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="mt-4 rounded-2xl bg-koi-paper p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-koi-ink">Pick a ready-made page</h3>
            {missingRecommended.length > 1 ? (
              <button
                type="button"
                onClick={onAddAllRecommended}
                disabled={busy}
                className="text-sm font-medium text-koi-deep underline underline-offset-2 disabled:opacity-60"
              >
                {busyKey === "__all__" ? "Adding…" : `Add all recommended (${missingRecommended.length})`}
              </button>
            ) : null}
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <li
                key={idea.key}
                className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-koi-ink/5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-koi-ink">{idea.label}</span>
                  {idea.recommended ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                      Recommended
                    </span>
                  ) : null}
                </div>
                {idea.description ? (
                  <p className="mt-1 text-sm text-koi-ink/60">{idea.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-koi-ink/50">Includes: {describeSections(idea.sections)}</p>
                <button
                  type="button"
                  onClick={() => addPage(idea, idea.key, idea.key)}
                  disabled={busy}
                  className="mt-3 self-start rounded-full bg-koi-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {busyKey === idea.key ? "Adding…" : "Add page"}
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={onCreateCustom} className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-koi-ink/5">
            <h3 className="text-sm font-semibold text-koi-ink">Or make your own</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="block text-sm">
                <span className="text-koi-ink/70">Page name</span>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Our Story"
                  className="mt-1 w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
                />
              </label>
              <label className="block text-sm">
                <span className="text-koi-ink/70">Start with</span>
                <select
                  value={customLayout}
                  onChange={(e) => setCustomLayout(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-koi-ink/10 bg-white px-3 py-2.5 text-sm text-koi-ink outline-none focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
                >
                  {PAGE_STARTERS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label === BLANK_STARTER.label ? "Simple text page" : `${s.label} layout`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={busy || !customName.trim()}
                className="rounded-full bg-koi-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {busyKey === "__custom__" ? "Creating…" : "Create page"}
              </button>
            </div>
            {customName.trim() ? (
              <p className="mt-2 break-all text-xs text-koi-ink/55">
                {customReserved ? (
                  <>This page is already built in — edit it in the main pages list.</>
                ) : customFinalKey ? (
                  <>
                    Web address: <span className="font-mono">{siteUrl}/p/{customFinalKey}</span>
                  </>
                ) : (
                  <>Use letters or numbers in the name.</>
                )}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {justAdded.length > 0 && !error ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {justAdded.length === 1 ? (
            <>
              Added “{labelForPageKey(templateKey, justAdded[0]!)}” as a draft.{" "}
              <Link href={`${editBase}/${justAdded[0]}`} className="font-medium underline underline-offset-2">
                Fill it in now →
              </Link>
            </>
          ) : (
            <>Added {justAdded.length} draft pages. Open each one below to fill it in and publish.</>
          )}
        </div>
      ) : null}

      <ul className="mt-4 divide-y divide-koi-ink/5 overflow-hidden rounded-2xl ring-1 ring-koi-ink/10">
        {sortedPages.length === 0 ? (
          <li className="px-4 py-4 text-sm text-koi-ink/60">
            No extra pages yet — tap “Add a page” to pick one.
          </li>
        ) : (
          sortedPages.map((p) => {
            const live = p.status === "published";
            return (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                  justAdded.includes(p.key) ? "bg-emerald-50/60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-koi-ink">{labelForPageKey(templateKey, p.key)}</div>
                  <div className="break-all font-mono text-xs text-koi-ink/50">/p/{p.key}</div>
                </div>
                <StatusPill tone={live ? "live" : "draft"}>{live ? "Live" : "Draft · hidden"}</StatusPill>
                <div className="flex items-center gap-3">
                  {live ? (
                    <a
                      href={`${siteUrl}/p/${p.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-koi-ink/70 underline underline-offset-2"
                    >
                      View
                    </a>
                  ) : null}
                  <Link
                    href={`${editBase}/${p.key}`}
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/15 hover:bg-koi-paper"
                  >
                    {live ? "Edit" : "Edit & publish"}
                  </Link>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
