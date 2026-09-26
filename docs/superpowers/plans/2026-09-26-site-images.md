# Site Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generated sites get real photos (curated Unsplash library), editors can pick or upload images, and the `site-assets` bucket exists.

**Architecture:** Pure module `src/lib/stockPhotos.ts` (data in `stockPhotoData.ts`) exposes categories, deterministic picking and `fillSiteImages`. Both AI routes ask the model for a `photoCategory` and fill image slots server-side. A client `ImageField` (with a `SiteImageProvider` context that knows `siteId` + template category) replaces raw URL inputs in Gallery/Team editors and offers Suggest / Upload / Clear.

**Tech Stack:** Next.js 16 app router, React 19, Supabase JS v2 (storage), Node built-in test runner (`npm test`), Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-26-site-images-design.md`

## Global Constraints

- Modules loaded by `npm test` use relative `.ts` imports (never `@/`), e.g. `import type { PageData } from "./pageSchema.ts";`.
- Photo URLs: `https://images.unsplash.com/<id>?auto=format&fit=crop&w=<width>&q=75`; ids look like `photo-1629909613654-28e377c37b09`. Only free-license photos (not `plus.unsplash.com`).
- Categories (exact keys): `corporate, clinic, beauty, real_estate, food, tech, creative, fashion, fitness, education, construction, retail, events, logistics, general`.
- Template → default category: `t1→corporate, t2→creative, t3→creative, t4→tech, t5→beauty, t6→real_estate`, else `general`.
- Never overwrite a non-empty image URL.
- Source files are CRLF; use the Edit tool, not sed/perl multi-line edits.
- Storage bucket name: `site-assets` (public). Upload path: `<siteId>/images/<Date.now()>-<safeFilename>`.

---

### Task 1: Curate photo data

**Files:**
- Create: `src/lib/stockPhotoData.ts`
- Create: `tests/check-stock-photos.mjs` (manual, network; not matched by `tests/*.test.mjs`)

**Interfaces:**
- Produces: `export type StockPhoto = { id: string; alt: string };` `export const STOCK_PHOTOS: Record<PhotoCategory, StockPhoto[]>;` `export const PEOPLE_PHOTOS: StockPhoto[];` `export const PHOTO_CATEGORIES = [...] as const; export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];`

- [ ] **Step 1: Collect IDs in the Browser pane.** For each category, navigate to `https://unsplash.com/s/photos/<query>?license=free&orientation=landscape` and run in the page:

```js
await new Promise(r=>setTimeout(r,3000));
[...document.querySelectorAll('figure img[src*="images.unsplash.com/photo-"]')]
  .map(i=>({id:(i.src.match(/photo-[0-9]+-[0-9a-f]+/)||[])[0],alt:i.alt}))
  .filter(x=>x.id && x.alt).slice(0,14)
```

Queries: corporate=`modern office team`, clinic=`medical clinic`, beauty=`beauty salon makeup`, real_estate=`modern house interior`, food=`restaurant food`, tech=`software startup laptop`, creative=`design studio`, fashion=`fashion editorial`, fitness=`gym fitness`, education=`classroom students`, construction=`construction site`, retail=`retail store`, events=`event venue`, logistics=`logistics warehouse`, general=`small business`. People: `professional portrait` with `orientation=portrait`, 16 entries. Keep 12 per category; drop alts that are empty or obviously off-topic.

- [ ] **Step 2: Write `src/lib/stockPhotoData.ts`**

```ts
// Curated free-license Unsplash photos (hotlinked). Relative-import safe for the Node test runner.
export const PHOTO_CATEGORIES = [
  "corporate", "clinic", "beauty", "real_estate", "food", "tech", "creative",
  "fashion", "fitness", "education", "construction", "retail", "events", "logistics", "general",
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];
export type StockPhoto = { id: string; alt: string };

export const STOCK_PHOTOS: Record<PhotoCategory, StockPhoto[]> = {
  corporate: [ /* 12 × { id: "photo-…", alt: "…" } from Step 1 */ ],
  // …one entry per category
};

export const PEOPLE_PHOTOS: StockPhoto[] = [ /* 16 portraits */ ];
```

- [ ] **Step 3: Write `tests/check-stock-photos.mjs`**

```js
// Manual: node --experimental-strip-types --no-warnings tests/check-stock-photos.mjs
import { STOCK_PHOTOS, PEOPLE_PHOTOS } from "../src/lib/stockPhotoData.ts";
const all = [...Object.values(STOCK_PHOTOS).flat(), ...PEOPLE_PHOTOS];
const ids = new Set(all.map((p) => p.id));
if (ids.size !== all.length) console.warn(`duplicate ids: ${all.length - ids.size}`);
let bad = 0;
await Promise.all(all.map(async (p) => {
  const r = await fetch(`https://images.unsplash.com/${p.id}?w=64&q=10`, { method: "HEAD" });
  if (r.status !== 200) { bad++; console.log(r.status, p.id); }
}));
console.log(`${all.length - bad}/${all.length} ok`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 4: Run it.** Expected: `N/N ok`, exit 0. Replace any failing id and rerun.
- [ ] **Step 5: Commit** `git add src/lib/stockPhotoData.ts tests/check-stock-photos.mjs && git commit -m "Add curated stock photo library"`

---

### Task 2: Picking + fill logic

**Files:**
- Create: `src/lib/stockPhotos.ts`
- Test: `tests/stockPhotos.test.mjs`

**Interfaces:**
- Consumes: Task 1 exports; `PageData`, `Section` from `./pageSchema.ts`.
- Produces:
  - `photoUrl(id: string, width?: number): string`
  - `normalizeCategory(value: unknown): PhotoCategory`
  - `categoryForTemplate(templateKey: string | null | undefined): PhotoCategory`
  - `pickPhotos(category: PhotoCategory, count: number, seed: string): StockPhoto[]`
  - `fillSiteImages<T extends Record<string, PageData>>(pages: T, category: PhotoCategory, seed: string): T`
  - `PHOTO_CATEGORY_PROMPT: string` (prompt fragment for AI routes)
  - re-exports `PHOTO_CATEGORIES`, `PhotoCategory`, `StockPhoto`, `STOCK_PHOTOS`

- [ ] **Step 1: Write failing tests `tests/stockPhotos.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STOCK_PHOTOS, categoryForTemplate, fillSiteImages, normalizeCategory, photoUrl, pickPhotos,
} from "../src/lib/stockPhotos.ts";

const page = (sections) => ({ seo: { title: "", description: "" }, sections });

test("photoUrl builds hotlink", () => {
  assert.equal(photoUrl("photo-1-a", 800), "https://images.unsplash.com/photo-1-a?auto=format&fit=crop&w=800&q=75");
});

test("normalizeCategory falls back to general", () => {
  assert.equal(normalizeCategory("clinic"), "clinic");
  assert.equal(normalizeCategory(" Clinic "), "clinic");
  assert.equal(normalizeCategory("spaceships"), "general");
  assert.equal(normalizeCategory(undefined), "general");
});

test("categoryForTemplate maps templates", () => {
  assert.equal(categoryForTemplate("t5"), "beauty");
  assert.equal(categoryForTemplate("t6"), "real_estate");
  assert.equal(categoryForTemplate("zzz"), "general");
});

test("pickPhotos is deterministic, unique, sized", () => {
  const a = pickPhotos("clinic", 8, "Acme");
  assert.deepEqual(a, pickPhotos("clinic", 8, "Acme"));
  assert.equal(a.length, 8);
  assert.equal(new Set(a.map((p) => p.id)).size, 8);
  assert.notDeepEqual(a.map((p) => p.id), pickPhotos("clinic", 8, "Other").map((p) => p.id));
  const clinicIds = new Set(STOCK_PHOTOS.clinic.map((p) => p.id));
  assert.ok(clinicIds.has(a[0].id), "category photos come first");
});

test("pickPhotos tops up past category size", () => {
  const n = STOCK_PHOTOS.clinic.length + 3;
  const r = pickPhotos("clinic", n, "x");
  assert.equal(r.length, n);
  assert.equal(new Set(r.map((p) => p.id)).size, n);
});

test("fillSiteImages fills empty gallery to 6 and team photos", () => {
  const pages = {
    home: page([{ type: "hero", headline: "", subtext: "", ctaText: "", ctaHref: "" },
                { type: "gallery", title: "G", images: [{ url: "", alt: "" }] }]),
    about: page([{ type: "team", title: "", subtitle: "", members: [{ name: "A", role: "", bio: "", photoUrl: "" }] }]),
  };
  const before = JSON.stringify(pages);
  const out = fillSiteImages(pages, "clinic", "Acme");
  assert.equal(JSON.stringify(pages), before, "input not mutated");
  const g = out.home.sections[1];
  assert.equal(g.images.length, 6);
  assert.ok(g.images.every((i) => i.url.startsWith("https://images.unsplash.com/") && i.alt));
  assert.ok(out.about.sections[0].members[0].photoUrl.startsWith("https://images.unsplash.com/"));
  assert.deepEqual(out, fillSiteImages(pages, "clinic", "Acme"));
});

test("fillSiteImages keeps existing urls and only fills blanks", () => {
  const pages = { home: page([{ type: "gallery", title: "G", images: [{ url: "https://x/1.jpg", alt: "mine" }, { url: "", alt: "" }] }]) };
  const g = fillSiteImages(pages, "food", "s").home.sections[0];
  assert.equal(g.images.length, 2);
  assert.deepEqual(g.images[0], { url: "https://x/1.jpg", alt: "mine" });
  assert.ok(g.images[1].url.startsWith("https://images.unsplash.com/"));
});

test("fillSiteImages adds a home gallery before faq/contact when missing", () => {
  const pages = { home: page([
    { type: "hero", headline: "", subtext: "", ctaText: "", ctaHref: "" },
    { type: "faq", title: "", items: [] },
    { type: "contact_card", showForm: true, mapLink: "" },
  ]) };
  const s = fillSiteImages(pages, "tech", "s").home.sections;
  assert.deepEqual(s.map((x) => x.type), ["hero", "gallery", "faq", "contact_card"]);
  assert.equal(s[1].images.length, 6);
});

test("no photo repeats across the whole site", () => {
  const pages = {
    home: page([{ type: "gallery", title: "", images: [] }]),
    about: page([{ type: "gallery", title: "", images: [] }]),
  };
  const out = fillSiteImages(pages, "beauty", "s");
  const urls = [...out.home.sections[0].images, ...out.about.sections[0].images].map((i) => i.url);
  assert.equal(new Set(urls).size, urls.length);
});
```

- [ ] **Step 2: Run** `npm test` — expected FAIL (cannot find module `stockPhotos.ts`).

- [ ] **Step 3: Implement `src/lib/stockPhotos.ts`**

```ts
// Relative imports (not "@/") so the Node test runner can load this module.
import type { PageData, Section } from "./pageSchema.ts";
import {
  PEOPLE_PHOTOS, PHOTO_CATEGORIES, STOCK_PHOTOS, type PhotoCategory, type StockPhoto,
} from "./stockPhotoData.ts";

export { PHOTO_CATEGORIES, STOCK_PHOTOS, type PhotoCategory, type StockPhoto };

const GALLERY_SIZE = 6;

const TEMPLATE_CATEGORY: Record<string, PhotoCategory> = {
  t1: "corporate", t2: "creative", t3: "creative", t4: "tech", t5: "beauty", t6: "real_estate",
};

export const PHOTO_CATEGORY_PROMPT = `Also include a top-level "photoCategory" field: the ONE value from this list that best fits the business: ${PHOTO_CATEGORIES.join(", ")}. Leave every image "url" and "photoUrl" as "" — the server fills in photos.`;

export function photoUrl(id: string, width = 1600) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;
}

export function normalizeCategory(value: unknown): PhotoCategory {
  const v = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  return (PHOTO_CATEGORIES as readonly string[]).includes(v) ? (v as PhotoCategory) : "general";
}

export function categoryForTemplate(templateKey: string | null | undefined): PhotoCategory {
  return (templateKey && TEMPLATE_CATEGORY[templateKey]) || "general";
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  let a = hash(seed) || 1;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Ordered, de-duplicated pool: category photos first, then the rest of the library. */
function pool(category: PhotoCategory, seed: string): StockPhoto[] {
  const seen = new Set<string>();
  const out: StockPhoto[] = [];
  const add = (list: StockPhoto[]) => {
    for (const p of list) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  };
  add(shuffled(STOCK_PHOTOS[category], seed));
  if (category !== "general") add(shuffled(STOCK_PHOTOS.general, seed));
  add(shuffled(PHOTO_CATEGORIES.flatMap((c) => STOCK_PHOTOS[c]), seed));
  return out;
}

export function pickPhotos(category: PhotoCategory, count: number, seed: string): StockPhoto[] {
  const p = pool(category, seed);
  return Array.from({ length: Math.max(0, count) }, (_, i) => p[i % p.length]!);
}

function picker(list: StockPhoto[]) {
  let i = 0;
  return () => list[i++ % list.length]!;
}

function galleryInsertIndex(sections: Section[]) {
  const i = sections.findIndex((s) => s.type === "faq" || s.type === "contact_card");
  return i === -1 ? sections.length : i;
}

export function fillSiteImages<T extends Record<string, PageData>>(
  pages: T,
  category: PhotoCategory,
  seed: string,
): T {
  const next = picker(pool(category, seed));
  const nextPerson = picker(shuffled(PEOPLE_PHOTOS, seed));
  const toImage = (p: StockPhoto) => ({ url: photoUrl(p.id), alt: p.alt });

  const fillSection = (s: Section): Section => {
    if (s.type === "gallery") {
      const images = s.images ?? [];
      if (images.every((im) => !im.url?.trim()) && images.length < GALLERY_SIZE) {
        return { ...s, images: Array.from({ length: GALLERY_SIZE }, () => toImage(next())) };
      }
      return { ...s, images: images.map((im) => (im.url?.trim() ? im : toImage(next()))) };
    }
    if (s.type === "team") {
      return {
        ...s,
        members: s.members.map((m) =>
          m.photoUrl?.trim() ? m : { ...m, photoUrl: photoUrl(nextPerson().id, 800) },
        ),
      };
    }
    return s;
  };

  const out = {} as Record<string, PageData>;
  for (const [key, page] of Object.entries(pages)) {
    let sections = page.sections.map(fillSection);
    if (key === "home" && !sections.some((s) => s.type === "gallery")) {
      const at = galleryInsertIndex(sections);
      const gallery: Section = {
        type: "gallery",
        title: "Gallery",
        images: Array.from({ length: GALLERY_SIZE }, () => toImage(next())),
      };
      sections = [...sections.slice(0, at), gallery, ...sections.slice(at)];
    }
    out[key] = { ...page, sections };
  }
  return out as T;
}
```

Note: the home gallery added last draws later picks than existing galleries; that's fine (still unique until the library is exhausted).

- [ ] **Step 4: Run** `npm test` — expected all PASS. Also `npx tsc --noEmit` — no errors.
- [ ] **Step 5: Commit** `git add src/lib/stockPhotos.ts tests/stockPhotos.test.mjs && git commit -m "Add stock photo picking and site image fill"`

---

### Task 3: AI routes fill images

**Files:**
- Modify: `src/app/api/ai/generate-site/route.ts` (prompt ~L90-157, response ~L264-300)
- Modify: `src/app/api/ai/generate-site-groq/route.ts` (prompt ~L70-137, response ~L183-215)

**Interfaces:**
- Consumes: `PHOTO_CATEGORY_PROMPT`, `normalizeCategory`, `fillSiteImages` from `@/lib/stockPhotos`; `PageData` from `@/lib/pageSchema`.

- [ ] **Step 1: In both prompts** add `"photoCategory": string,` as the first key of the top-level schema object, replace the gallery line's `(use empty "" url if unknown)` with `(url "" — server fills photos; write specific, descriptive alt text)`, and append `${PHOTO_CATEGORY_PROMPT}` on its own line after the Requirements list.

- [ ] **Step 2: In both response blocks**, after the per-page `validatePageData` loop and before `return NextResponse.json(...)`:

```ts
const profile = (parsed as Record<string, unknown>).profile;
const businessName =
  isRecord(profile) && typeof profile.business_name === "string" ? profile.business_name : brief.slice(0, 80);
const filled = fillSiteImages(
  { home, about, contact } as { home: PageData; about: PageData; contact: PageData },
  normalizeCategory((parsed as Record<string, unknown>).photoCategory),
  businessName,
);
```

and return `pages: filled` (plus `photoCategory` for debugging). In `generate-site/route.ts`, adapt names to its local variables (`pages` object and its `isRecord` helper; add a local `isRecord` if missing: `const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);`).

- [ ] **Step 3: Verify** `npx tsc --noEmit` passes, then with dev server running:

```bash
curl -s localhost:3000/api/ai/generate-site-groq -H 'content-type: application/json' -d '{"brief":"Bright Smile dental clinic in Ikeja, family dentistry"}' | grep -o 'images.unsplash.com/photo-[^?]*' | head
```

Expected: several URLs. (If the route requires auth, instead exercise via the admin UI in Task 6.)
- [ ] **Step 4: Commit** `git commit -am "AI generation fills site images from stock library"`

---

### Task 4: Storage bucket + upload helper

**Files:**
- Create: `supabase/migrations/004_site_assets_bucket.sql`
- Modify: `src/lib/assets.ts` (add `uploadSiteImage`)

**Interfaces:**
- Produces: `uploadSiteImage(siteId: string, file: File): Promise<string>` (public URL).

- [ ] **Step 1: Migration**

```sql
-- 004_site_assets_bucket.sql — run once in Supabase SQL Editor.
-- Creates the public site-assets bucket + admin-write / public-read policies.
-- Requires public.is_admin() from supabase/schema.sql.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins manage site-assets" on storage.objects;
drop policy if exists "Allow public read access to site-assets" on storage.objects;

create policy "Admins manage site-assets" on storage.objects
for all to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

create policy "Allow public read access to site-assets" on storage.objects
for select to public
using (bucket_id = 'site-assets');
```

- [ ] **Step 2: `uploadSiteImage` in `src/lib/assets.ts`**

```ts
export async function uploadSiteImage(siteId: string, file: File): Promise<string> {
  if (!file) throw new Error("File is required.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller.");

  const supabase = await getAuthenticatedClient();
  const path = `${siteId}/images/${Date.now()}-${safeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message)) {
      throw new Error("Storage bucket 'site-assets' is missing. Run supabase/migrations/004_site_assets_bucket.sql in the Supabase SQL Editor.");
    }
    throw uploadError;
  }

  // Record the asset; failure here shouldn't block using the uploaded image.
  await supabase.from("assets").insert({
    site_id: siteId,
    path,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    meta: { originalFilename: file.name, kind: "image" },
  });

  return getPublicAssetUrl(path);
}
```

- [ ] **Step 3:** `npx tsc --noEmit` passes.
- [ ] **Step 4: Commit** `git add supabase/migrations/004_site_assets_bucket.sql src/lib/assets.ts && git commit -m "Add site-assets bucket migration and image upload helper"`

---

### Task 5: ImageField + editor wiring

**Files:**
- Create: `src/components/page-editor/ImageField.tsx` (includes `SiteImageProvider`)
- Modify: `src/components/page-editor/GalleryEditor.tsx` (URL input → `ImageField`)
- Modify: `src/components/page-editor/TeamEditor.tsx` (~L117-132 Photo URL input → `ImageField`)
- Modify: `src/app/admin/sites/[siteId]/pages/[key]/page.tsx` and `.../extra-pages/[key]/page.tsx` (wrap editor return in `<SiteImageProvider siteId={siteId}>`)

**Interfaces:**
- Consumes: `STOCK_PHOTOS`, `PHOTO_CATEGORIES`, `photoUrl`, `categoryForTemplate`, `PhotoCategory` from `@/lib/stockPhotos`; `uploadSiteImage` from `@/lib/assets`; `supabaseBrowser` from `@/lib/supabase/browser`.
- Produces: `export function SiteImageProvider({ siteId, children })`; `export default function ImageField({ label, value, onChange, onPick? })` where `onPick?: (url: string, alt: string) => void` replaces `onChange` for stock picks (single update, carries alt).

- [ ] **Step 1: Write `ImageField.tsx`**

```tsx
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
```

- [ ] **Step 2: GalleryEditor** — replace the `<label>` containing "Image URL" with (one `updateImage` call per pick, so url + alt never race):

```tsx
<div className="sm:col-span-2">
  <ImageField
    label="Image"
    value={it.url}
    onChange={(url) => updateImage(idx, { url })}
    onPick={(url, alt) => updateImage(idx, { url, alt: it.alt || alt })}
  />
</div>
```

Add `import ImageField from "./ImageField";`.

- [ ] **Step 3: TeamEditor** — replace the Photo URL `<label>` block with:

```tsx
<div className="sm:col-span-2">
  <ImageField
    label="Photo (optional)"
    value={m.photoUrl ?? ""}
    onChange={(url) => {
      const members = value.members.map((x, i) => (i === idx ? { ...x, photoUrl: url } : x));
      onChange({ ...value, members });
    }}
  />
</div>
```

Add `import ImageField from "./ImageField";`.

- [ ] **Step 4: Editor pages** — import `{ SiteImageProvider } from "@/components/page-editor/ImageField"` and wrap the top-level JSX of the main `return (` (pages/[key] ~L383, extra-pages/[key] ~L223) in `<SiteImageProvider siteId={siteId}> … </SiteImageProvider>`.

- [ ] **Step 5:** `npx tsc --noEmit` and `npm run lint` pass for touched files.
- [ ] **Step 6: Commit** `git add src/components/page-editor src/app/admin/sites && git commit -m "Image picker with stock suggestions and uploads in page editor"`

---

### Task 6: Verify end to end

- [ ] **Step 1:** `npm test` all pass; `node --experimental-strip-types --no-warnings tests/check-stock-photos.mjs` all ok.
- [ ] **Step 2:** Start dev server (preview_start). Open `/dev/templates/t1` etc. still render (no regressions).
- [ ] **Step 3:** If Supabase reachable and logged in: open a site page editor → gallery → Suggest → pick → thumbnail + alt set; Upload an image (expect success after migration, or the bucket-missing hint before). Generate a site via AI → gallery/team have photos; preview shows images in hero/gallery.
- [ ] **Step 4:** Screenshot proof; push.
