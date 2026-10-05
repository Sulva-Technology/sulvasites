"use client";

import { useId, useMemo, useState } from "react";

import { SITE_IMAGE_TYPES } from "@/lib/assets";
import { MAX_SETUP_UPLOADS, MAX_STOCK_PICKS, type SetupUpload } from "@/lib/ai/setupPhotos";
import { PHOTO_CATEGORIES, STOCK_PHOTOS, normalizeCategory, photoUrl, pickPhotos, type StockPhoto } from "@/lib/stockPhotos";

import { checkImageFile } from "./LogoStep";
import { StepCard, primaryBtn, secondaryBtn, type StepProps } from "./stepUi";

export type PhotoChoice = { uploads: SetupUpload[]; stockIds: string[] };

const BY_ID: Map<string, StockPhoto> = new Map(PHOTO_CATEGORIES.flatMap((c) => STOCK_PHOTOS[c]).map((p) => [p.id, p]));

export function stockPhoto(id: string): StockPhoto | undefined {
  return BY_ID.get(id);
}

function altFromName(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Photo";
}

export function PhotoStep(p: StepProps<PhotoChoice> & { category: string; seed: string }) {
  const inputId = useId();
  const [tab, setTab] = useState<"own" | "demo">("own");
  const [shuffle, setShuffle] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const { uploads, stockIds } = p.value;

  const grid = useMemo(() => {
    const picked = stockIds.map((id) => BY_ID.get(id)).filter((x): x is StockPhoto => !!x);
    const fresh = pickPhotos(normalizeCategory(p.category), 36, `${p.seed}#${shuffle}`).filter((x) => !stockIds.includes(x.id));
    const seen = new Set<string>();
    return [...picked, ...fresh].filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, Math.max(24, picked.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-pick only on category / seed / shuffle, not on every toggle
  }, [p.category, p.seed, shuffle]);

  function addFiles(list: FileList | null | undefined) {
    if (!list || p.disabled) return;
    const errs: string[] = [];
    const next = [...uploads];
    for (const file of Array.from(list)) {
      const problem = checkImageFile(file);
      if (problem) {
        errs.push(problem);
        continue;
      }
      if (next.length >= MAX_SETUP_UPLOADS) {
        errs.push(`Up to ${MAX_SETUP_UPLOADS} photos; "${file.name}" was not added.`);
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file), alt: altFromName(file.name) });
    }
    setErrors(errs);
    p.onChange({ uploads: next, stockIds });
  }

  function removeUpload(i: number) {
    const u = uploads[i];
    if (u) URL.revokeObjectURL(u.previewUrl);
    p.onChange({ uploads: uploads.filter((_, j) => j !== i), stockIds });
  }

  function setAlt(i: number, alt: string) {
    p.onChange({ uploads: uploads.map((u, j) => (j === i ? { ...u, alt: alt.slice(0, 120) } : u)), stockIds });
  }

  function toggleStock(id: string) {
    if (stockIds.includes(id)) p.onChange({ uploads, stockIds: stockIds.filter((x) => x !== id) });
    else if (stockIds.length < MAX_STOCK_PICKS) p.onChange({ uploads, stockIds: [...stockIds, id] });
  }

  const tabBtn = (key: "own" | "demo", label: string, count: number) => (
    <button
      type="button"
      role="tab"
      id={`${inputId}-tab-${key}`}
      aria-selected={tab === key}
      aria-controls={`${inputId}-panel-${key}`}
      onClick={() => setTab(key)}
      className={
        "rounded-full px-3 py-1.5 text-sm font-medium transition " + (tab === key ? "bg-white text-koi-ink shadow-sm" : "text-koi-ink/60 hover:text-koi-ink")
      }
    >
      {label}
      {count ? <span className="ml-1.5 rounded-full bg-koi-ink px-1.5 py-0.5 text-xs text-white">{count}</span> : null}
    </button>
  );

  return (
    <StepCard
      step={3}
      label="Photos step"
      title="Choose photos"
      hint="Your photos are used first; picked demo photos next; anything left is filled automatically."
      footer={
        <>
          <button type="button" className={primaryBtn} disabled={p.disabled || (!uploads.length && !stockIds.length)} onClick={p.onDone}>
            Use these photos
          </button>
          <button type="button" className={secondaryBtn} disabled={p.disabled} onClick={p.onSkip}>
            Choose for me
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Photo source" className="inline-flex gap-1 rounded-full bg-koi-ink/5 p-1">
        {tabBtn("own", "Your photos", uploads.length)}
        {tabBtn("demo", "Demo photos", stockIds.length)}
      </div>

      {tab === "own" ? (
        <div role="tabpanel" id={`${inputId}-panel-own`} aria-labelledby={`${inputId}-tab-own`} className="mt-3">
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition " +
              (over ? "border-koi-sea bg-koi-paper" : "border-koi-ink/15 hover:border-koi-sea/50")
            }
          >
            <span className="font-medium text-koi-ink">Drop photos here or click to choose</span>
            <span className="mt-1 text-xs text-koi-ink/55">
              Up to {MAX_SETUP_UPLOADS} images, 10 MB each ({uploads.length}/{MAX_SETUP_UPLOADS} added)
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            accept={SITE_IMAGE_TYPES.join(",")}
            className="sr-only"
            disabled={p.disabled || uploads.length >= MAX_SETUP_UPLOADS}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {errors.length ? (
            <ul role="alert" className="mt-2 space-y-0.5 text-sm text-red-700">
              {errors.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
          {uploads.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {uploads.map((u, i) => (
                <li key={u.previewUrl} className="overflow-hidden rounded-2xl ring-1 ring-koi-ink/10">
                  <div className="relative aspect-[4/3] bg-koi-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.previewUrl} alt={u.alt} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeUpload(i)}
                      disabled={p.disabled}
                      aria-label={`Remove ${u.file.name}`}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-koi-ink/70 text-xs text-white hover:bg-black"
                    >
                      ✕
                    </button>
                  </div>
                  <label className="block p-1.5">
                    <span className="sr-only">Description of {u.file.name}</span>
                    <input
                      value={u.alt}
                      onChange={(e) => setAlt(i, e.target.value)}
                      disabled={p.disabled}
                      placeholder="Describe the photo"
                      className="w-full rounded-full border border-koi-ink/10 px-2.5 py-1 text-xs outline-none focus:border-koi-sea"
                    />
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel" id={`${inputId}-panel-demo`} aria-labelledby={`${inputId}-tab-demo`} className="mt-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-koi-ink/60">
              {stockIds.length}/{MAX_STOCK_PICKS} picked
            </span>
            <button type="button" className={secondaryBtn} onClick={() => setShuffle((n) => n + 1)} disabled={p.disabled}>
              Shuffle
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {grid.map((ph) => {
              const on = stockIds.includes(ph.id);
              const full = !on && stockIds.length >= MAX_STOCK_PICKS;
              return (
                <li key={ph.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={p.disabled || full}
                    onClick={() => toggleStock(ph.id)}
                    title={ph.alt}
                    className={
                      "relative block aspect-square w-full overflow-hidden rounded-2xl transition disabled:opacity-40 " +
                      (on ? "ring-4 ring-koi-ink" : "ring-1 ring-koi-ink/10 hover:ring-koi-sea/50")
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(ph.id, 400)} alt={ph.alt} loading="lazy" className="h-full w-full object-cover" />
                    {on ? (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-koi-ink text-xs text-white" aria-hidden>
                        {stockIds.indexOf(ph.id) + 1}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </StepCard>
  );
}
