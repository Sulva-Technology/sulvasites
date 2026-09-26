# Site images: curated stock photos, editor picker, uploads

Date: 2026-09-26 · Status: approved

## Problem

Generated sites are text-only. The AI prompt tells models to emit `""` for image URLs,
so `gallery.images`, `team.members[].photoUrl` and use-case covers are empty. Templates
already source hero/listing photos from the gallery, so empty galleries mean no photos
anywhere. Separately, the `site-assets` storage bucket is never created by
`supabase/schema.sql`, so uploads fail.

## Decisions

- No Unsplash API key. Use a **curated library** of Unsplash photo IDs, hotlinked from
  `images.unsplash.com` (Unsplash License permits hotlinking; attribution not required).
- No new hero image field; templates keep deriving hero imagery from the gallery.

## Components

### 1. `src/lib/stockPhotos.ts` (pure, no Next imports — Node test runner loads it)

- `PHOTO_CATEGORIES`: ~15 keys — `corporate`, `clinic`, `beauty`, `real_estate`, `food`,
  `tech`, `creative`, `fashion`, `fitness`, `education`, `construction`, `retail`,
  `events`, `logistics`, `general`.
- Each category: ≥10 `{ id, alt }` entries plus a small `people` list (portraits) shared
  for team photos.
- `photoUrl(id, width = 1600)` → `https://images.unsplash.com/<id>?auto=format&fit=crop&w=<width>&q=75`.
- `normalizeCategory(value)` → valid key, else `general`.
- `pickPhotos(category, count, seed)` → deterministic, no repeats (tops up from `general`
  if the category runs short).
- `fillSiteImages(pages, category, seed)` → returns pages with empty image slots filled:
  gallery images (pad gallery to ≥6 when it has <6 and all are empty), team `photoUrl`
  (from `people`), and adds a gallery to `home` if none exists. Never overwrites a
  non-empty URL. Mutation-free.

### 2. AI routes (`generate-site`, `generate-site-groq`)

- Prompt: add top-level `"photoCategory": one of <list>`; tell model to leave image URLs
  `""` (server fills them).
- After parse/validation: `pages = fillSiteImages(pages, normalizeCategory(photoCategory), businessName)`.
- Shared prompt fragment + category list exported from `stockPhotos.ts` so both routes stay in sync.

### 3. Editor: `src/components/admin/ImageField.tsx`

- Props: `value`, `onChange(url)`, `siteId`, `category?`.
- Shows thumbnail + URL input + buttons **Suggest**, **Upload**, **Clear**.
- Suggest: modal grid of the category's photos, category dropdown to browse others; click selects.
- Upload: `uploadSiteImage(siteId, file)` in `src/lib/assets.ts` → `site-assets/<siteId>/images/<ts>-<name>`,
  inserts `assets` row, returns public URL. Errors shown inline (e.g. bucket missing → hint to run migration).
- Wired into the page editor(s) wherever gallery image URL / team photoUrl inputs exist
  (`src/app/admin/sites/[siteId]/pages/[key]/page.tsx`, `.../extra-pages/[key]/page.tsx`).
- Category for Suggest: stored per site? No — derived client-side from template key
  (t1→corporate, t2→creative, t3→creative, t4→tech, t5→beauty, t6→real_estate) with dropdown override.

### 4. `supabase/migrations/004_site_assets_bucket.sql`

- `insert into storage.buckets (id, name, public) values ('site-assets','site-assets',true) on conflict do nothing;`
- Admin-write / public-read policies (from `supabase/fixes/fix_storage_rls.sql`), idempotent.
- User runs it once in Supabase SQL Editor.

## Error handling

- Unknown/missing `photoCategory` → `general`.
- Upload failure → inline message; field keeps previous value.
- Broken hotlink risk mitigated by verifying every ID returns HTTP 200 before commit
  (script in `tests/`, network-dependent, not part of `npm test`).

## Testing

- `tests/stockPhotos.test.mjs`: `pickPhotos` determinism, no repeats, count honoured;
  `fillSiteImages` fills empties only, preserves existing URLs, adds home gallery when missing,
  does not mutate input; `normalizeCategory` fallback.
- `tests/check-stock-photos.mjs` (manual): HEAD every URL, fail on non-200.
- Browser: `/dev/templates/<key>` + editor picker/upload smoke test.
