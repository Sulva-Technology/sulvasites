# Assistant: Logo, Colours and Photos Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site-creation chat actually use the owner: after the AI has the brief, it asks for a logo, lets the owner pick colours (from the logo, presets, words they typed, or custom), and lets them add their own photos and/or pick demo stock photos — and all of it lands in the created site.

**Architecture:** The LLM keeps doing what it is good at (extracting the brief in ≤3 questions). Brand + photos become a deterministic, UI-driven **setup stage** that starts when `ready` is true: three inline step cards in the chat log (Logo → Colours → Photos), then Build. Choices live client-side in a `SiteSetup` object. Stock picks travel to the server `finish` stage (which fills galleries); uploaded files never leave the browser until the site exists, then `createSiteFromBuild` uploads them, swaps `upload:N` placeholder URLs for public URLs, saves the logo and writes `theme_colors[templateKey]`.

**Tech Stack:** Next.js 16, React 19, Supabase storage (`site-assets` bucket), existing Groq pipeline (`src/lib/ai/*`), Node test runner.

**Spec / root cause (from code reading 2026-10-05):**
- `src/lib/ai/prompts/builders.ts:61` tells the model "Never ask about templates, colours, fonts or design: the builder chooses."
- `decideReady` (`src/lib/ai/assistant.ts:45`) ends the chat after the name + one fact, so there is no point where images or colours are requested.
- `finishSite` (`src/lib/ai/siteBuilder.ts:247`) always fills galleries with random category stock; owner never sees or chooses them.
- `createSiteFromBuild` (`src/lib/ai/createSite.ts`) never sets a logo or `business_profiles.theme_colors`, so every AI site ships with template default colours.
- Shapes to reuse: `theme_colors = { [templateKey]: { accent, accent2, ink, muted, bg, surface } }` (see `src/app/admin/sites/[siteId]/preview/page.tsx:219`); `uploadLogo(siteId, file)` and `uploadSiteImage(siteId, file)` in `src/lib/assets.ts`; `extractLogoColors(url)` in `src/lib/logoColors.ts`; `pickPhotos(category, count, seed)` + `photoUrl(id, width)` in `src/lib/stockPhotos.ts`; `TEMPLATE_THEME_CONFIGS[t].defaults` in `src/lib/templateTheme.ts`.

## Global Constraints

- Max 3 LLM questions stays (`MAX_CHAT_QUESTIONS = 3`). Setup steps are UI cards, not LLM questions, and every step is skippable ("Skip — choose for me").
- Uploads: `SITE_IMAGE_TYPES` only, ≤10 MB each, max 8 photos + 1 logo. Validate client-side before accepting.
- Server `finish` stage accepts stock URLs only from `https://images.unsplash.com/` built by `photoUrl()`; reject anything else (no arbitrary URLs reach pages).
- Palette: accent must reach ≥ 3:1 contrast against the template `bg`; otherwise darken until it does. Never change `bg`/`ink` from template defaults (keeps dark-mode CSS overrides working).
- Changing template after build must re-derive the palette for the new `templateKey` (store the owner's *choice* — accent + accent2 — not a template-specific palette).
- Pure helpers in `src/lib/ai/setup*.ts` use relative `.ts` imports only (Node test runner).
- UI uses the koi primitives from `2026-10-05-admin-koi-redesign.md` if merged; otherwise current Tailwind classes. No new deps.
- CRLF files: Edit tool only.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/ai/setupPalette.ts` (new, pure) | colour words → hex, presets per photo category, expand choice → 6-key palette with contrast guard |
| `src/lib/ai/setupPhotos.ts` (new, pure) | `SiteSetup` types, `placeOwnerImages()`, `replaceUploadTokens()`, stock URL validation |
| `src/lib/ai/brief.ts` (modify) | add `colors: string` to `Brief` |
| `src/lib/ai/prompts/builders.ts` (modify) | allow extracting stated colours; ready reply mentions setup |
| `src/lib/ai/assistant.ts` (modify) | `readyReply` copy |
| `src/lib/ai/siteBuilder.ts` (modify) | `finishSite(plan, profile, results, opts)` with `preferred` images + `uploadSlots` |
| `src/app/api/ai/assistant/build/route.ts` (modify) | parse/validate `preferredImages`, `uploadSlots` on `finish` |
| `src/lib/ai/assistantClient.ts` (modify) | `runStagedBuild` passes setup image options to finish |
| `src/lib/ai/createSite.ts` (modify) | upload logo + photos, swap tokens, save `theme_colors` |
| `src/components/admin/assistant/LogoStep.tsx` (new) | logo drop zone, preview, extracts colours |
| `src/components/admin/assistant/ColorStep.tsx` (new) | swatch rows + custom pickers + live mini preview |
| `src/components/admin/assistant/PhotoStep.tsx` (new) | own-photo uploader + stock demo grid with multi-select |
| `src/components/admin/SiteAssistant.tsx` (modify) | setup stage state machine, summary chips on result card |
| `tests/aiSetupPalette.test.mjs`, `tests/aiSetupPhotos.test.mjs` (new); `tests/aiCore.test.mjs`, `tests/aiSiteBuilder.test.mjs` (extend) | |

---

### Task 1: Palette helpers

**Files:** Create `src/lib/ai/setupPalette.ts`; Test `tests/aiSetupPalette.test.mjs`.

**Interfaces (Produces):**
```ts
export type ColorChoice = { accent: string; accent2: string; source: "logo" | "preset" | "words" | "custom" };
export type PalettePreset = { id: string; name: string; accent: string; accent2: string };
export function colorWordsToChoice(text: string): ColorChoice | null;      // "navy and gold" -> {accent:"#c9a227", accent2:"#14213d", source:"words"}
export function presetsFor(category: string): PalettePreset[];              // 6 presets, first is the category's signature
export function choiceFromLogo(palette: string[]): ColorChoice | null;      // most saturated -> accent, darkest -> accent2
export function expandPalette(templateKey: string, choice: ColorChoice): Record<string, string>; // 6 keys
export function contrastRatio(a: string, b: string): number;
```

- [ ] **Step 1: Write failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorWordsToChoice, presetsFor, choiceFromLogo, expandPalette, contrastRatio } from "../src/lib/ai/setupPalette.ts";
import { TEMPLATE_THEME_CONFIGS } from "../src/lib/templateTheme.ts";

test("colour words map to accent + dark", () => {
  const c = colorWordsToChoice("we like navy and gold");
  assert.equal(c.source, "words");
  assert.equal(c.accent, "#c9a227");
  assert.equal(c.accent2, "#14213d");
  assert.equal(colorWordsToChoice("no preference"), null);
});

test("six presets per category, valid hex", () => {
  for (const cat of ["food", "clinic", "beauty", "general"]) {
    const p = presetsFor(cat);
    assert.equal(p.length, 6);
    for (const x of p) assert.match(x.accent, /^#[0-9a-f]{6}$/);
  }
});

test("logo palette: saturated -> accent, darkest -> accent2", () => {
  const c = choiceFromLogo(["#f2f2f2", "#e63946", "#1d3557"]);
  assert.deepEqual([c.accent, c.accent2], ["#e63946", "#1d3557"]);
  assert.equal(choiceFromLogo([]), null);
});

test("expand keeps template bg/ink and enforces 3:1 accent contrast", () => {
  const pal = expandPalette("t1", { accent: "#fff7a8", accent2: "#111111", source: "custom" });
  const d = TEMPLATE_THEME_CONFIGS.t1.defaults;
  assert.equal(pal.bg, d.bg);
  assert.equal(pal.ink, d.ink);
  assert.ok(contrastRatio(pal.accent, pal.bg) >= 3);
  assert.deepEqual(Object.keys(pal).sort(), ["accent", "accent2", "bg", "ink", "muted", "surface"]);
});
```

- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3: Implement** (`setupPalette.ts`, relative imports):

```ts
import { TEMPLATE_THEME_CONFIGS } from "../templateTheme.ts";

export type ColorChoice = { accent: string; accent2: string; source: "logo" | "preset" | "words" | "custom" };
export type PalettePreset = { id: string; name: string; accent: string; accent2: string };

const WORDS: Record<string, string> = {
  red: "#d62828", maroon: "#7a1f2b", burgundy: "#7a1f3d", pink: "#e75480", orange: "#f77f00", coral: "#ff6f59",
  yellow: "#f4c430", gold: "#c9a227", green: "#2a9d8f", emerald: "#0f9d58", olive: "#6b7d2a", teal: "#0f8b8d",
  blue: "#1b6fe0", navy: "#14213d", sky: "#4fb6ff", purple: "#6a4c93", lilac: "#b497d6", brown: "#7f5539",
  beige: "#d6c4a8", black: "#111111", grey: "#6b7280", gray: "#6b7280", white: "#ffffff",
};
const HEX_RE = /^#[0-9a-f]{6}$/i;

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const sat = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const darken = (hex: string, f: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0")).join("");

export function colorWordsToChoice(text: string): ColorChoice | null {
  const found = (text.toLowerCase().match(/[a-z]+/g) ?? []).map((w) => WORDS[w]).filter((h): h is string => !!h);
  if (!found.length) return null;
  const sorted = [...new Set(found)].sort((a, b) => lum(a) - lum(b)); // darkest first
  const accent = [...sorted].sort((a, b) => sat(b) - sat(a))[0]!;
  const accent2 = sorted.find((h) => h !== accent && lum(h) < 0.2) ?? "#111111";
  return { accent, accent2, source: "words" };
}

const PRESETS: Record<string, PalettePreset[]> = { /* 6 per PHOTO_CATEGORIES key; "general" fallback.
  Each: { id, name, accent, accent2 } — e.g. food: Paprika #d1495b/#2b2118, Olive #6b7d2a/#1f2416, Saffron #f4a259/#2a1b0e, Berry #8e2c48/#1a0f14, Mint #2a9d8f/#0f1f1d, Charcoal #e76f51/#111111 */ };
export function presetsFor(category: string): PalettePreset[] {
  return PRESETS[category] ?? PRESETS.general!;
}

export function choiceFromLogo(palette: string[]): ColorChoice | null {
  const hex = palette.filter((h) => HEX_RE.test(h)).map((h) => h.toLowerCase());
  if (!hex.length) return null;
  const accent = [...hex].sort((a, b) => sat(b) - sat(a))[0]!;
  const dark = [...hex].sort((a, b) => lum(a) - lum(b)).find((h) => h !== accent && lum(h) < 0.2);
  return { accent, accent2: dark ?? "#111111", source: "logo" };
}

export function expandPalette(templateKey: string, choice: ColorChoice): Record<string, string> {
  const d = TEMPLATE_THEME_CONFIGS[templateKey]?.defaults ?? TEMPLATE_THEME_CONFIGS.t1!.defaults;
  let accent = HEX_RE.test(choice.accent) ? choice.accent.toLowerCase() : d.accent!;
  for (let i = 0; i < 12 && contrastRatio(accent, d.bg!) < 3; i++) accent = darken(accent, 0.85);
  const accent2 = HEX_RE.test(choice.accent2) ? choice.accent2.toLowerCase() : d.accent2!;
  return { ...d, accent, accent2 };
}
```
Write the full `PRESETS` table (15 categories × 6, literal hex values) — it is data, keep it in this file.

- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `Add assistant palette helpers (colour words, presets, logo, contrast)`

---

### Task 2: Brief learns colours; prompt + ready copy

**Files:** Modify `src/lib/ai/brief.ts`, `src/lib/ai/prompts/builders.ts`, `src/lib/ai/assistant.ts`; Test: extend `tests/aiCore.test.mjs` (or whichever file covers `normalizeBrief`/`readyReply` — grep first).

**Interfaces:** `Brief.colors: string` (≤80 chars, owner's own words, e.g. "navy and gold"); `mergeBrief` treats it like `tone`.

- [ ] **Step 1: Failing tests**

```js
test("brief keeps stated colours", () => {
  const b = normalizeBrief({ businessName: "X", colors: "navy and gold" });
  assert.equal(b.colors, "navy and gold");
  assert.equal(mergeBrief(b, normalizeBrief({})).colors, "navy and gold");
});
test("ready reply announces logo, colours and photos", () => {
  const r = readyReply({ ...emptyBrief(), businessName: "Kings Bakery", whatTheyDo: "bakes bread" });
  assert.match(r, /logo/i); assert.match(r, /colou?rs/i); assert.match(r, /photos/i);
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement**
  - `brief.ts`: add `colors: ""` to `emptyBrief`, `b.colors = str(r.colors, 80)` in `normalizeBrief`, add `"colors"` to the scalar list in `mergeBrief`, include `Colours: …` line in `briefToText` when set.
  - `builders.ts` `BRIEF_SHAPE`: add `"colors": string`. Replace line 61 rule with: `"- Never ask about templates, fonts, colours, logo or photos — the app asks for those itself after the chat. But if the owner states colours (e.g. 'our colours are navy and gold'), copy them into colors."`
  - `assistant.ts` `readyReply`: `Got it: ${name}${what}${where}. Next, add your logo, pick your colours and choose photos below — or skip any of them and I will choose.`
- [ ] **Step 4:** `npm test` → PASS (fix any snapshot-style prompt test in `tests/aiPrompts.test.mjs` that asserts the old line).
- [ ] **Step 5: Commit** `Assistant brief captures stated colours; ready reply hands off to setup`

---

### Task 3: Photo helpers + finish stage honours choices

**Files:** Create `src/lib/ai/setupPhotos.ts`; Modify `src/lib/ai/siteBuilder.ts`, `src/app/api/ai/assistant/build/route.ts`, `src/lib/ai/assistantClient.ts`; Tests `tests/aiSetupPhotos.test.mjs`, extend `tests/aiSiteBuilder.test.mjs`.

**Interfaces (Produces):**
```ts
// setupPhotos.ts
export type ImageRef = { url: string; alt: string };
export type SetupUpload = { file: File; previewUrl: string; alt: string };      // client only
export type SiteSetup = {
  logo: { file: File; previewUrl: string } | null;
  color: ColorChoice | null;                    // from setupPalette.ts
  uploads: SetupUpload[];                       // ≤ 8
  stockIds: string[];                           // StockPhoto ids picked in the grid, ≤ 12
  skipped: { logo: boolean; color: boolean; photos: boolean };
};
export const UPLOAD_TOKEN = "upload:";          // gallery url placeholder: "upload:0", "upload:1"…
export function isAllowedStockUrl(url: string): boolean;                 // startsWith("https://images.unsplash.com/photo-")
export function placeOwnerImages<T extends Record<string, PageData>>(pages: T, owner: ImageRef[]): T;
export function replaceUploadTokens<T extends Record<string, PageData>>(pages: T, urls: Array<string | null>, fallback: (i: number) => ImageRef): T;
// siteBuilder.ts
export type FinishOptions = { preferred?: ImageRef[]; uploadSlots?: number };
export function finishSite(plan: SitePlan, profile: SiteProfile, results: PageResult[], opts?: FinishOptions): BuildResult;
```
`placeOwnerImages` rule: owner images go first into the **home** gallery (creating one at the same index `fillSiteImages` uses if missing), then other pages' galleries, never into team photos; existing non-empty urls are untouched. `fillSiteImages` then fills remaining empty slots with stock (it already skips non-empty urls).

- [ ] **Step 1: Failing tests**

```js
test("owner images fill home gallery first", () => {
  const pages = { home: { seo: { title: "t", description: "d" }, sections: [{ type: "gallery", title: "G", images: [{ url: "", alt: "" }, { url: "", alt: "" }] }] } };
  const out = placeOwnerImages(pages, [{ url: "upload:0", alt: "Shop front" }]);
  assert.equal(out.home.sections[0].images[0].url, "upload:0");
  assert.equal(out.home.sections[0].images[1].url, "");
});
test("tokens replaced; failed upload falls back to stock", () => {
  const pages = { home: { seo: { title: "t", description: "d" }, sections: [{ type: "gallery", title: "G", images: [{ url: "upload:0", alt: "a" }, { url: "upload:1", alt: "b" }] }] } };
  const out = replaceUploadTokens(pages, ["https://x.supabase.co/a.jpg", null], () => ({ url: "https://images.unsplash.com/photo-1?w=1600", alt: "stock" }));
  assert.deepEqual(out.home.sections[0].images.map((i) => i.url), ["https://x.supabase.co/a.jpg", "https://images.unsplash.com/photo-1?w=1600"]);
});
test("only unsplash photo urls are allowed", () => {
  assert.ok(isAllowedStockUrl("https://images.unsplash.com/photo-123?w=1600"));
  assert.ok(!isAllowedStockUrl("https://evil.example/photo.jpg"));
});
```
In `tests/aiSiteBuilder.test.mjs` (reuse its existing plan/profile fixtures):
```js
test("finishSite puts upload slots then preferred stock before random stock", () => {
  const r = finishSite(plan, profile, results, { uploadSlots: 2, preferred: [{ url: "https://images.unsplash.com/photo-abc?w=1600", alt: "Pick" }] });
  const g = r.pages.home.sections.find((s) => s.type === "gallery");
  assert.deepEqual(g.images.slice(0, 3).map((i) => i.url), ["upload:0", "upload:1", "https://images.unsplash.com/photo-abc?w=1600"]);
  assert.ok(!r.notes.some((n) => n.startsWith("Photos are stock images")));
});
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement**
  - `finishSite`: after `applyQualityGate(...)`, build `owner = [...Array(uploadSlots).keys()].map(i => ({ url: \`upload:${i}\`, alt: \`${brief.businessName} photo ${i+1}\` })).concat(preferred.filter(p => isAllowedStockUrl(p.url)))`, run `placeOwnerImages(gated.pages, owner)` then `fillSiteImages`. Replace the generic stock note with `"Your photos and picks are used first; remaining slots use matching stock photos."` when `owner.length`.
  - Route `finish`: `uploadSlots = Math.max(0, Math.min(8, Number(body.uploadSlots) || 0))`; `preferred = Array.isArray(body.preferredImages) ? body.preferredImages.filter(isRecord).map(x => ({ url: str(x.url, 300), alt: str(x.alt, 120) })).filter(x => isAllowedStockUrl(x.url)).slice(0, 12) : []`.
  - `runStagedBuild` input gains `images?: { preferred: ImageRef[]; uploadSlots: number }`, forwarded in the `finish` POST body as `preferredImages` / `uploadSlots`.
- [ ] **Step 4:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `Assistant finish stage places owner uploads and picked stock photos first`

---

### Task 4: createSiteFromBuild saves logo, palette and uploads

**Files:** Modify `src/lib/ai/createSite.ts` (browser code; no unit test — verified in Task 6 E2E).

**Interfaces:**
- Consumes: `SiteSetup`, `replaceUploadTokens`, `expandPalette`, `uploadLogo`, `uploadSiteImage`, `pickPhotos`, `photoUrl`.
- Produces: `createSiteFromBuild(result: BuildResult, desiredSlug: string, setup?: SiteSetup): Promise<CreateSiteOutcome>`

- [ ] **Step 1:** After the site row insert (existing slug loop), before saving pages:
  1. `const urls = await Promise.all(setup.uploads.map(u => uploadSiteImage(siteId, u.file).catch(e => { warnings.push(\`Photo "${u.file.name}" could not be uploaded (${e.message}); a stock photo was used.\`); return null; })))`.
  2. `const spare = pickPhotos(result.photoCategory, 8, slug)`; `const pages = replaceUploadTokens({ ...result.pages, ...Object.fromEntries(result.extraPages.map(e => [e.key, e.data])) }, urls, i => ({ url: photoUrl(spare[i % spare.length].id), alt: spare[i % spare.length].alt }))` and use those pages in the existing save loops.
  3. Logo: `if (setup.logo) await uploadLogo(siteId, setup.logo.file).catch(e => warnings.push(\`Logo upload failed (${e.message}). Add it on the site page.\`))`.
  4. Palette: `if (setup.color)` → `business_profiles.update({ theme_colors: { [result.templateKey]: expandPalette(result.templateKey, setup.color) } })` merged into the existing profile `payload` (one update, not two). On "column does not exist" push the same migration-003 warning text the preview page uses.
- [ ] **Step 2:** `npm run typecheck && npm run lint`.
- [ ] **Step 3: Commit** `Create AI sites with owner logo, palette and uploaded photos`

---

### Task 5: Setup step UI in the chat

**Files:** Create `src/components/admin/assistant/{LogoStep,ColorStep,PhotoStep}.tsx`; Modify `src/components/admin/SiteAssistant.tsx`.

**Interfaces:**
```ts
type StepProps<T> = { value: T; onChange: (v: T) => void; onDone: () => void; onSkip: () => void; disabled?: boolean };
export function LogoStep(p: StepProps<SiteSetup["logo"]> & { onColors: (c: ColorChoice | null) => void }): JSX.Element;
export function ColorStep(p: StepProps<ColorChoice | null> & { category: string; templateKey: string; fromLogo: ColorChoice | null; fromWords: ColorChoice | null }): JSX.Element;
export function PhotoStep(p: StepProps<{ uploads: SetupUpload[]; stockIds: string[] }> & { category: string; seed: string }): JSX.Element;
```

Flow in `SiteAssistant` (`phase: "chat" | "logo" | "color" | "photos" | "review"`):
- When a chat turn returns `ready`, append the ready reply, set `phase = "logo"`. The free-text composer stays usable (more details still update the brief) but the primary action becomes the current step.
- Each finished/skipped step appends a short assistant line + a user "receipt" bubble (e.g. thumbnail of logo, 2 swatches, "3 photos + 4 stock picks"), so the conversation reads naturally; then advances.
- After photos → show "Build my site" (`phase = "review"`). Clicking a receipt bubble's "Change" jumps back to that step.

Step details:
- **LogoStep:** drop zone + file input (`accept={SITE_IMAGE_TYPES.join(",")}`), 10 MB check, preview via `URL.createObjectURL`, then `extractLogoColors(previewUrl)` → `choiceFromLogo(result.palette)` → `onColors`. Buttons: "Use this logo", "I don't have one". Revoke object URLs on replace/unmount.
- **ColorStep:** rows: "From your logo" (if any), "From what you told me" (`colorWordsToChoice(brief.colors)`), "Suggested for {category}" (`presetsFor(suggestedCategory)` — category from `suggestedTemplate`→`categoryForTemplate`), "Custom" (two `<input type="color">` for Main colour / Dark colour). Each option = pill with two swatches + name, `role="radio"`. Live mini preview: a small card showing a button + heading using `expandPalette(suggestedTemplate.templateKey, choice)`. Buttons: "Use these colours", "Choose for me" (skip).
- **PhotoStep:** two panes as `Tabs`: "Your photos" (multi-file drop zone, ≤8, thumbnails with remove ✕ and an editable alt text input) and "Demo photos" (grid of `pickPhotos(category, 24, seed)` thumbnails at `photoUrl(id, 400)`, toggle select, max 12, selected count badge, "Shuffle" re-seeds). Explain: "Your photos are used first; picked demo photos next; anything left is filled automatically." Buttons: "Use these photos", "Choose for me".
- `build()` passes `images: { uploadSlots: setup.uploads.length, preferred: setup.stockIds.map(id => ({ url: photoUrl(id), alt: STOCK alt lookup })) }` to `runStagedBuild`; `create()` passes `setup` to `createSiteFromBuild`.
- Result card adds a "Brand" row (logo thumb + palette swatches recomputed with `expandPalette(templateKey, setup.color)` so a template switch updates them) and a photo strip of the home gallery (resolve `upload:N` → `setup.uploads[N].previewUrl` for display).
- Persist nothing in localStorage (Files cannot be serialised); warn with `beforeunload` while setup has uploads and the site isn't created.

- [ ] **Step 1:** Build the three step components.
- [ ] **Step 2:** Wire the phase machine + receipts into `SiteAssistant`.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test`.
- [ ] **Step 4: Commit** `Assistant setup steps: logo, colours, own and demo photos`

---

### Task 6: End-to-end verification

- [ ] **Step 1:** `preview_start` the dev server, log in as admin, open `/admin/sites/new`.
- [ ] **Step 2:** Chat: "Kings Bakery in Lagos, we bake bread and cakes, our colours are navy and gold." → ready; Logo step appears.
- [ ] **Step 3:** Upload a test PNG logo → colours row "From your logo" appears; choose "From what you told me" (navy/gold). Photos: upload 2 local images, pick 3 demo photos. Build.
- [ ] **Step 4:** Result card shows swatches + photo strip with the 2 uploads first. Switch template → "Rewrite" → swatches recomputed for the new template.
- [ ] **Step 5:** Create → on the site page: logo set; preview uses the gold accent (`getComputedStyle(root).getPropertyValue('--tN-accent')` via `javascript_tool`); home gallery first two images are `site-assets/<siteId>/images/...`, next three are the picked Unsplash ids. `read_network_requests` shows the `finish` POST carried `uploadSlots: 2` and 3 `preferredImages`.
- [ ] **Step 6:** Repeat with every step skipped → behaves exactly like today (random stock, template default colours, no logo).
- [ ] **Step 7:** Commit any fixes; report screenshots.

---

## Open questions (defaults chosen; change before executing if wrong)

1. Should the owner dashboard (non-admin) also get this assistant? **Default: no** — creation stays admin-only (`requireAdmin`), matching the back-office decision that owners never create sites.
2. Hero background images: templates' `hero` section has no image field today, so photos go to galleries (and team photos stay stock people). Adding a hero image slot per template is a separate change. **Default: out of scope.**
3. AI-generated images (vs. stock): **Default: no** — stock + uploads only, nothing fabricated.
