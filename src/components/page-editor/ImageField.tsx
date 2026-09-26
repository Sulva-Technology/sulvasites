"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { uploadSiteImage } from "@/lib/assets";
import {
  PHOTO_CATEGORIES, STOCK_PHOTOS, categoryForTemplate, photoUrl, type PhotoCategory,
} from "@/lib/stockPhotos";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Ctx = { siteId: string; category: PhotoCategory };
const SiteImageCtx = createContext<Ctx>({ siteId: "", category: "general" });

/** Gives ImageFields the site id (for uploads) and a default photo category (from the template). */
export function SiteImageProvider({ siteId, children }: { siteId: string; children: React.ReactNode }) {
  const [category, setCategory] = useState<PhotoCategory>("general");
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    supabaseBrowser()
      .from("sites")
      .select("template_key")
      .eq("id", siteId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCategory(categoryForTemplate((data as { template_key?: string } | null)?.template_key));
      });
    return () => { cancelled = true; };
  }, [siteId]);
  return <SiteImageCtx.Provider value={{ siteId, category }}>{children}</SiteImageCtx.Provider>;
}

const label = (c: string) => c.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

export default function ImageField({
  label: fieldLabel,
  value,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onPick?: (url: string, alt: string) => void;
}) {
  const { siteId, category } = useContext(SiteImageCtx);
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState<PhotoCategory>(category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setBrowse(category), [category]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadSiteImage(siteId, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const btn = "rounded bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50";

  return (
    <div className="block">
      <span className="text-sm font-medium text-gray-800">{fieldLabel}</span>
      <div className="mt-1 flex items-start gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-gray-400">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="https://..."
            type="url"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setOpen((o) => !o)}>
              {open ? "Close suggestions" : "Suggest"}
            </button>
            <button type="button" className={btn} disabled={busy || !siteId} onClick={() => fileRef.current?.click()}>
              {busy ? "Uploading…" : "Upload"}
            </button>
            {value ? (
              <button type="button" className={btn} onClick={() => onChange("")}>Clear</button>
            ) : null}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error ? <div className="text-xs text-red-700">{error}</div> : null}
        </div>
      </div>

      {open ? (
        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            Category
            <select
              value={browse}
              onChange={(e) => setBrowse(e.target.value as PhotoCategory)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              {PHOTO_CATEGORIES.map((c) => (
                <option key={c} value={c}>{label(c)}</option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {STOCK_PHOTOS[browse].map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.alt}
                onClick={() => {
                  if (onPick) onPick(photoUrl(p.id), p.alt);
                  else onChange(photoUrl(p.id));
                  setOpen(false);
                }}
                className="aspect-[4/3] overflow-hidden rounded ring-1 ring-gray-200 hover:ring-2 hover:ring-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p.id, 320)} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Photos from Unsplash (free to use).</p>
        </div>
      ) : null}
    </div>
  );
}
