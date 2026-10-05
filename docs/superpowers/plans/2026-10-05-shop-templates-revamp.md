# Shop Templates Revamp (t13 × Offloop, t14 × Norma) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the look of both e-commerce templates so each one reads as a high-end, art-directed store: **t13 "Mode"** (fashion) takes the dark cinematic language of **offloop.org**, and **t14 "Cartly"** (general store) takes the quiet, product-first language of **nor.ma**.

**Architecture:** Visual rewrite only. Each template keeps its folder, `TemplateProps`, section contract, ctx, shop routing and cart/checkout logic. We replace the CSS tokens and stylesheet, restyle every section and shop view, and add a few new home-only blocks that read real shop data (not editor sections, same rule as today's `T13Looks` / `T14Storefront`). New pure logic goes in `template1X/lib.ts` with no `@/` imports, so the Node test runner can load it.

**Tech Stack:** Next.js (App Router) client components, plain CSS per template (`templateNN.css`, `--tNN-*` vars), Google Fonts via `<TemplateFonts>`, Node built-in test runner (`npm test`), `tsc --noEmit`, ESLint.

**Spec:** This document is the spec. Design references were captured on 2026-10-05 from https://offloop.org and https://nor.ma (home + /shop). Details are in "Design reference A" and "Design reference B" below.

## Global Constraints

- Keep `TemplateProps`, `PageData` section types, `ShopViews` routing, `useCart`, the Paystack checkout flow and every API call exactly as they are. Visual only.
- Keep the six palette vars per template: `--t13-{accent,accent2,ink,muted,bg,surface}` and `--t14-…`. `TEMPLATE_THEME_CONFIGS` defaults must equal the CSS defaults (`tests/templateTheme.test.mjs` enforces this).
- Dark overrides go under `.templateNN[data-mode="dark"]` with `!important` so they beat saved inline palettes (existing convention). **Exception:** do not override `--tNN-accent` in dark mode; derive the dark-mode accent text from it with `color-mix` so the owner's brand colour still shows.
- Fonts load only through `<TemplateFonts href={FONTS} />`. Never use CSS `@import`, because it gets dropped from the bundled chunk.
- Every section keeps inline editing (`EditableText` + `useSectionEditor`) wherever it has it today.
- Home-only commerce blocks render only when `shop && shop.products.length > 0`, and never inside the editor's section list.
- No made-up claims on owners' sites: no star ratings, review counts, delivery dates, "VAT included", competitor comparisons or stock promises unless the data exists (`ShopData`, `profile`, sections).
- `prefers-reduced-motion: reduce` turns off beams, marquees, typewriter, char reveal, count-up, parallax and floats. Content must show at once.
- Text contrast is at least 4.5:1, or 3:1 for 24px+ text, in both modes. Write each checked pairing as a CSS comment, as the current files do.
- Source files use CRLF. Use the Edit/Write tools or Node scripts, not multi-line sed/perl.
- Tests import only `.ts` files with relative paths (no `@/`, no `.tsx`).
- Copy rule for template UI strings: sentence case, no exclamation marks, short.
- Commit after each task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Mapping decision

| Template | Category | Reference | Why |
|---|---|---|---|
| **t13 Mode** | Fashion shop | **offloop.org** | Cinematic graded photography, an editorial serif (Denton, with Instrument Serif as its fallback) and a dark stage make clothing look like a campaign. Offloop's sticky split sections and mono-tag cards work well as "new in" feeds and lookbooks. |
| **t14 Cartly** | General store | **nor.ma** | Norma is a product configurator site: neutral greys, rounded cards, a pill nav and object-on-white imagery. Any product catalogue fits this, and its `/shop` page is a ready-made product page pattern. |

To swap them, Part A and Part B trade folders. Nothing else changes.

---

## Design reference A — offloop.org (→ t13 Mode)

Captured at 1440×900.

**Palette (dark stage)**
- Page `#0a0a0b` (`oklch(.15 .002 258)`), raised card `#161618`, inner card `#1c1c1f`, hairline `rgb(255 255 255 / .08)`.
- Text: primary `#ffffff`; secondary `oklch(.705 .015 258)` ≈ `#9ea3ad`; tertiary `oklch(.4748 .006 258)` ≈ `#5f636a`; glass text `rgb(255 255 255 / .85)`.
- Signal colours: green `#61df84` (status dots), violet `#a48eff`, chart lime `#d4f53c`.
- Light section: peach→lilac→sky gradient (`#f3d6c2 → #ece2ea → #b8cdf1`) with a white app window.

**Type**
- Display: Denton, for which we use **Instrument Serif** 400 (Offloop's own fallback). H1 48px/500 in the hero; section H2 64px/400, `letter-spacing:-1.28px`, `line-height:1.0`; FAQ H1 52px; blog card H3 48px.
- UI: **Inter**. Nav 13px/500; body 14–15px/1.6; group labels 11px/600 uppercase, `letter-spacing:.09em`.
- Meta and code: **JetBrains Mono** 12–13px (file names, diffs `+12 -2`, numbering `01`).

**Signature elements, top to bottom**
1. **Header**: transparent over the hero, 72px tall, 1280px max. Logo mark + wordmark on the left; nav on the right with 36px gaps and a white "Sign in" pill. Nav labels use a **rolling-letter hover**: each label is printed twice, stacked, and the letters slide up one by one.
2. **Hero**: full-viewport (`100svh`, min 560) photo graded blue, with volumetric light beams from the top left. A serif headline sits centred at about 60% height, with a 2–3 line sub (white/72) under it. Below that is a **glass email pill** (420×52, frosted, white "Join the waitlist →" button inside), a microline (11px, white/45) and a text link "Explore agent workflows".
3. **Sticky split sections**: left column holds a sticky serif H2 (64px) and a 14px muted paragraph. The right column scrolls a "feed" of dark cards (chat messages, tool cards, flow diagrams) that slide in as you scroll.
4. **Icon tile grid**: 4×4 squares with 20px radius. White filled tiles carry a logo; dark `#141416` tiles are left empty. They fade in staggered.
5. **Comparison bar charts**: a lime bar for "us", dark bars for others, and a legend in a left column.
6. **FAQ**: centred, 808px max. Serif title, then uppercase group labels, then pill rows (`#141416`, 14px radius, 56px tall) with a mono number `01`, the question and a `+` on the right.
7. **Statement**: a giant serif sentence ("You set the direction. Your agent team keeps the work moving.") whose letters light up as you scroll.
8. **Marquee**: an endless row of 290×150 cards. Each card has a dark window with mono lines and a footer of coloured dot + name + dim action.
9. **Blog feature card**: a 28px-radius `#161618` card holding serif title, byline, excerpt and mono tag chips, with a tall image on the right.
10. **Light gradient band**: a white app window (sidebar channels and main conversation) over the peach→sky gradient.
11. **Footer**: giant serif wordmark on the left with a tagline, four columns with 13px headings, a hairline, then the copyright.
12. **Floating composer**: fixed bottom-centre pill (600×52) with "+", an input whose placeholder **types itself** through example prompts, and a round white send button. Above it sit three overlapping avatars and "Agents are ready when you are".

## Design reference B — nor.ma (→ t14 Cartly)

Captured at 1440×900.

**Palette**
- White `#ffffff` page; paper `#f5f5f5` sections and cards; ink `#0a0a0a`; secondary `#6b6b6b`; tertiary `#a1a1a1`; hairline `rgb(10 10 10 / .08)`.
- Black `#0a0a0a` for buttons and dark bands; dark band gradient `#262626 → #0a0a0a`.
- The only colour is a single blue `#3b82f6` dot, in the final CTA.

**Type**
- **Suisse** (proprietary). For it we use **Inter Tight** for display and **Inter** for UI.
- H1 56px/600, `letter-spacing:-1.68px` (−0.03em), `line-height:1.02`. It is **two-tone**: line 1 is dimmed (white/55 on photo, `#a1a1a1` on paper) and line 2 is full ink.
- H2 36px/600, `letter-spacing:-0.54px`, `line-height:1.1`, always broken onto two balanced lines.
- H3 22px/600. Body 15–16px/1.6 `#6b6b6b`. Small 13px.

**Layout**
- Narrow content column (about 976px at 1440).
- Big bands are **inset** 12–16px from the viewport edges with a **24px radius**. Cards use 20–24px, inner media 16px, and all buttons and chips are pills.

**Signature elements, top to bottom**
1. **Header**: fixed at top 12px with three glass islands. Left: wordmark pill. Centre: nav pill with 14px line icons per item (How it works / FAQ / Mac / Journal). Right: locale chip and a black "Order" pill. The islands turn white-frosted over light sections.
2. **Hero**: inset rounded photo card (`calc(100svh-24px)`). Top-left: chip "Free worldwide shipping on 2+ Units". Two-column body: left the two-tone H1; right a 15px paragraph with bolded key words and two pills (white "Quick buy", glass "What are the features"). A glass chip at bottom-centre reads "● New batch in stock".
3. **Logo strip** that overlaps the hero (−32px) on a white rounded top: a two-line centred heading and logos.
4. **Split card**: left paper card (H2, paragraph, full-width black "Order →" pinned to the bottom); right image carousel with a dot pager pill.
5. **How it works**: centred H2 and three paper cards, each with a number badge, title, one line and a phone render. Under them, a chip row "Or start a scan from [Siri] [Action Button] [Widget]" and a black pill CTA.
6. **Tabbed features**: paper band. Left: H2 and **chip tabs** (active = black pill). Right: a phone mockup whose content changes per tab. A caption H3 and paragraph sit under the tabs.
7. **Stats band**: dark photo band with **glass stat tiles** (2×2; 44px numbers, label, sub-label).
8. **Comparison table**: black highlighted "Norma" column with ticks, crosses and tildes.
9. **Reviews**: paper card with a grayscale photo on the right. Rating, H2 and "See all reviews" pill, then a white card overlapping it with three review columns ("Read all", "Verified buyer" chip).
10. **Preset carousel**: H2 and paragraph with round prev/next buttons, then a horizontal rail of cards ("Deep work · 7 apps").
11. **Object spotlight**: full-height white section. The product render is centred (a steel disc), a hand reaches in from the left, and "Order your Norma." sits with a black pill below.
12. **FAQ**: hairline list with chevrons. **Journal**: a big card on the left (chip, read time) and a list with thumbs on the right.
13. **Final CTA**: dark inset band with a globe wireframe and a glowing blue dot casting a beam. Centred three-line H2 and a white pill.
14. **Footer**: wordmark, tagline, a pill email field with a black button, a locale chip, four columns and a bottom bar.
15. **Floating "% Get 10% off" pill** at the bottom left.
16. **/shop page**: H1 "Time to focus." with a paragraph. Left: a white rounded gallery card with arrows and a thumb row. Right: a white card with "Your Norma", rating, and **option rows as radio cards** (price on the right, strikethrough, "Save 10 €" chip, black "Best value" tag). Then an accessory row, Shipping/Total rows, a 40px total and a black full-width "Order now →". A status card reads "● New batch in stock / shipped within 24 hours". Below: a trust strip of icon pills, plus "We ship to 🇳🇬 Nigeria / get it by …" and a Delivery accordion.

**Deliberately not copied** (to obey the no-made-up-claims rule): the competitor comparison table, the star rating score, delivery-date promises and "VAT included". Where Norma uses these, we use real shop data instead: delivery fee, pickup, WhatsApp, product counts.

---

## File structure

### Shared
- Create `src/templates/shared/colorModeCore.ts`: pure `resolveMode(stored, prefersDark, fallback)`.
- Modify `src/templates/shared/colorMode.tsx`: `useColorMode(fallback?: ColorMode)` uses the core.
- Create `tests/colorModeCore.test.mjs`.

### Part A — t13 (all under `src/templates/template13/`)
- Modify `template13.css`: full rewrite (tokens, base, every component).
- Modify `Template13.tsx`: fonts, `useColorMode("dark")`, mounts `T13Composer`.
- Create `lib.ts`: pure helpers (search match, typewriter, char reveal, marquee picks, initials).
- Create `components/RollText.tsx`: the rolling-letter label.
- Create `components/T13Composer.tsx`: floating search composer.
- Modify `components/T13Header.tsx` and `components/T13Footer.tsx`.
- Modify `sections/T13Hero.tsx`.
- Delete `sections/T13Looks.tsx`; create `sections/T13NewIn.tsx` (sticky split product feed).
- Create `sections/T13Marquee.tsx`, `sections/T13Statement.tsx`, `sections/T13Studio.tsx`.
- Modify `sections/T13Sections.tsx` (mount order).
- Modify `sections/T13Services.tsx`, `T13Values.tsx`, `T13Testimonials.tsx`, `T13FAQ.tsx`, `T13Gallery.tsx`, `T13Team.tsx`, `T13RichText.tsx`, `T13BackedBy.tsx`, `T13UseCases.tsx`, `T13ContactCard.tsx`.
- Modify `shop/ShopList.tsx` (`?q=` search, category tabs), `shop/ProductCard.tsx`, `shop/ProductPage.tsx`, `shop/CartDrawer.tsx`, `shop/CartLines.tsx`, `shop/CartPage.tsx`, `shop/CheckoutPage.tsx`, `shop/OrderPage.tsx`, `shop/SizeGuide.tsx`.
- Modify `icons.tsx`: add `IconPlus`, `IconArrowUp`, `IconSearch`, `IconSpark`.
- Also modify `src/lib/templateTheme.ts` (t13 defaults), `src/templates/meta.ts` (t13 description), `tests/shopTemplates.test.mjs`; create `tests/t13Lib.test.mjs`.

### Part B — t14 (all under `src/templates/template14/`)
- Modify `template14.css`: full rewrite.
- Modify `Template14.tsx`: mounts `T14FloatPill`.
- Create `lib.ts`: pure helpers (two-tone split, stat parse, best-value variant, saving, balance break).
- Modify `components/T14Header.tsx` (three islands) and `components/T14Footer.tsx`.
- Create `components/T14FloatPill.tsx`.
- Modify `sections/T14Hero.tsx`.
- Delete `sections/T14Storefront.tsx`; create `sections/T14Strip.tsx`, `T14Feature.tsx`, `T14Showcase.tsx`, `T14Rail.tsx`, `T14Spotlight.tsx`.
- Modify `sections/T14Sections.tsx`, `T14Services.tsx`, `T14Values.tsx`, `T14Testimonials.tsx`, `T14FAQ.tsx`, `T14Gallery.tsx`, `T14Team.tsx`, `T14RichText.tsx`, `T14BackedBy.tsx`, `T14UseCases.tsx`, `T14ContactCard.tsx`.
- Modify `shop/ShopList.tsx` (toolbar replaces filter rail; filter logic unchanged), `shop/ProductCard.tsx`, `shop/ProductPage.tsx`, `shop/CartDrawer.tsx`, `shop/CartLines.tsx`, `shop/CartPage.tsx`, `shop/CheckoutPage.tsx`, `shop/OrderPage.tsx`, `shop/DealsStrip.tsx`, `shop/StickyCartBar.tsx`.
- Also modify `src/lib/templateTheme.ts` (t14 defaults), `src/templates/meta.ts` (t14 description), `tests/shopTemplates.test.mjs`; create `tests/t14Lib.test.mjs`.

Part A and Part B touch disjoint folders, so they can run in parallel worktrees after Task 0. `templateTheme.ts`, `meta.ts` and `shopTemplates.test.mjs` are shared, so merge those carefully.

---

## Task 0: Template-chosen default colour mode

**Files:**
- Create: `src/templates/shared/colorModeCore.ts`
- Modify: `src/templates/shared/colorMode.tsx`
- Test: `tests/colorModeCore.test.mjs`

**Interfaces:**
- Produces: `resolveMode(stored: ColorMode | null, prefersDark: boolean, fallback?: ColorMode): ColorMode` and `useColorMode(fallback?: ColorMode): [ColorMode, () => void]`. When `fallback` is passed, it beats the system preference. The visitor's saved choice still wins.

- [ ] **Step 1: Write the failing test**

```js
// tests/colorModeCore.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMode } from "../src/templates/shared/colorModeCore.ts";

test("saved choice always wins", () => {
  assert.equal(resolveMode("light", true, "dark"), "light");
  assert.equal(resolveMode("dark", false), "dark");
});

test("template fallback beats system preference", () => {
  assert.equal(resolveMode(null, false, "dark"), "dark");
  assert.equal(resolveMode(null, true, "light"), "light");
});

test("no fallback follows system", () => {
  assert.equal(resolveMode(null, true), "dark");
  assert.equal(resolveMode(null, false), "light");
});
```

- [ ] **Step 2: Run it and check that it fails**

Run: `npm test -- --test-name-pattern="saved choice|fallback|no fallback"`
Expected: FAIL, because the module `colorModeCore.ts` cannot be found.

- [ ] **Step 3: Implement**

```ts
// src/templates/shared/colorModeCore.ts
export type ColorMode = "light" | "dark";

/** Saved visitor choice, else the template's own default, else the system preference. */
export function resolveMode(stored: ColorMode | null, prefersDark: boolean, fallback?: ColorMode): ColorMode {
  if (stored) return stored;
  if (fallback) return fallback;
  return prefersDark ? "dark" : "light";
}
```

In `colorMode.tsx`:
- Replace `export type ColorMode = "light" | "dark";` with `export type { ColorMode } from "./colorModeCore";` plus `import { resolveMode, type ColorMode } from "./colorModeCore";`.
- Change the signature to `export function useColorMode(fallback?: ColorMode): [ColorMode, () => void]`.
- Set the initial state to `useState<ColorMode>(fallback ?? "light")`, so a dark-first template has no light flash.
- Inside the effect: `const sync = () => setMode(resolveMode(readStored(), !!mq?.matches, fallback));`. The effect deps are `[fallback]`.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npm test` then `npm run typecheck`
Expected: all PASS, and no TS errors (existing callers pass no argument).

- [ ] **Step 5: Commit**

```bash
git add src/templates/shared/colorModeCore.ts src/templates/shared/colorMode.tsx tests/colorModeCore.test.mjs
git commit -m "Let templates choose their default colour mode"
```

---

# PART A — t13 "Mode" × Offloop (cinematic dark fashion)

**Look in one line:** a blue-graded campaign film still, a serif headline in light, frosted glass, mono price tags, and a floating composer that types your products.

## Task A1: Tokens, fonts, metadata

**Files:**
- Modify: `src/templates/template13/template13.css`: replace everything from the file header down to the end of the `.template13[data-mode="dark"]` block. Keep the rest for now, because later tasks replace it.
- Modify: `src/templates/template13/Template13.tsx` (lines 21–22 `FONTS`, and the `useColorMode()` call)
- Modify: `src/lib/templateTheme.ts:149-156`
- Modify: `src/templates/meta.ts:17`
- Test: `tests/shopTemplates.test.mjs`

**Interfaces:**
- Produces the CSS custom properties that every later A-task uses. The names are binding:
  - `--t13-bg`, `--t13-surface`, `--t13-card`, `--t13-card-2`, `--t13-line`, `--t13-line-strong`
  - `--t13-ink`, `--t13-muted`, `--t13-dim`, `--t13-accent`, `--t13-text-accent`
  - `--t13-glass`, `--t13-glass-line`, `--t13-ok`, `--t13-warn`
  - `--t13-serif`, `--t13-font`, `--t13-mono`, `--t13-ease`, `--t13-max`, `--t13-gutter`, `--t13-section`, `--t13-r-lg`, `--t13-r-md`, `--t13-r-sm`

- [ ] **Step 1: Update the test first**

In `tests/shopTemplates.test.mjs`, change the t13 assertions:

```js
test("t13 Mode is registered as a shop template", () => {
  assert.equal(templateSupportsShop("t13"), true);
  assert.equal(templateSupportsShop("t12"), false);
  const meta = TEMPLATE_META.find((t) => t.key === "t13");
  assert.equal(meta?.name, "Mode");
  assert.equal(meta?.shop, true);
  assert.match(meta?.description ?? "", /cinematic/i);
  assert.equal(TEMPLATE_THEME_CONFIGS.t13.defaults.accent, "#6d5efc");
  assert.equal(TEMPLATE_THEME_CONFIGS.t13.defaults.accent2, "#0a0a0b");
  assert.equal(TEMPLATE_THEME_CONFIGS.t13.defaults.bg, "#f6f5f2");
});
```

- [ ] **Step 2: Run it and check that it fails**

Run: `npm test`
Expected: FAIL on the t13 accent, and `templateTheme` still passes.

- [ ] **Step 3: Set the defaults**

`src/lib/templateTheme.ts`. The light values are the "paper" mode; dark is the template's default *mode* via Task 0. The palette defaults stay light so that `sanitizeThemeStyle` and `expandPalette` (both of which assume a light bg) stay correct.

```ts
  // Fashion shop — "Mode" (cinematic, dark-first; these are the paper-mode values)
  t13: config("t13", {
    accent: "#6d5efc",
    accent2: "#0a0a0b",
    ink: "#111113",
    muted: "#5d6069",
    bg: "#f6f5f2",
    surface: "#ecebe7",
  }, { accent2: "Night bands & footer", surface: "Cards / panels" }),
```

`src/templates/meta.ts`, t13 description: `"Fashion and clothing brands: a cinematic dark storefront with serif headlines, a lookbook feed, cart and Paystack checkout. Dark + light modes."`

`Template13.tsx`:

```ts
const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
```

and change it to `const [mode, toggleMode] = useColorMode("dark");`.

- [ ] **Step 4: Write the token block**

Replace the head of `template13.css` with:

```css
/* Template 13 — "Mode": fashion brands with an online shop.
   Cinematic and dark-first (after offloop.org): Instrument Serif headlines over Inter, JetBrains Mono
   for prices/SKUs/numbering, blue-graded full-bleed photography with light beams, frosted glass pills,
   sticky split sections, a product marquee, a gradient "studio" window and a floating search composer.
   Paper (light) mode keeps the same layout on warm off-white. */

.template13 {
  /* Owner palette (paper values; dark mode re-maps the neutrals, never the accent). */
  --t13-accent: #6d5efc;
  --t13-accent2: #0a0a0b;
  --t13-ink: #111113;
  --t13-muted: #5d6069;
  --t13-bg: #f6f5f2;
  --t13-surface: #ecebe7;

  --t13-card: #ffffff;
  --t13-card-2: #f1f0ec;
  --t13-dim: #8a8d94;                 /* decorative / large text only */
  --t13-line: color-mix(in srgb, var(--t13-ink) 9%, transparent);
  --t13-line-strong: color-mix(in srgb, var(--t13-ink) 20%, transparent);
  --t13-text-accent: color-mix(in oklab, var(--t13-accent) 82%, black); /* ≥4.5:1 on bg for default */
  --t13-glass: rgb(255 255 255 / 0.62);
  --t13-glass-line: rgb(17 17 19 / 0.08);
  --t13-ok: #1f8a4c;
  --t13-warn: #a8620b;

  /* Always-dark stage (hero, studio caption, footer in paper mode keeps light). */
  --t13-night: #0a0a0b;
  --t13-on-night: #ffffff;
  --t13-on-night-2: #9ea3ad;          /* 7.4:1 on night */
  --t13-on-night-3: #5f636a;          /* decorative only */

  --t13-serif: "Instrument Serif", "Iowan Old Style", "Times New Roman", serif;
  --t13-font: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --t13-mono: "JetBrains Mono", ui-monospace, "SF Mono", Consolas, monospace;
  --t13-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --t13-max: 1280px;
  --t13-gutter: clamp(20px, 3vw, 36px);
  --t13-section: clamp(64px, 9vw, 120px);
  --t13-r-lg: 28px;
  --t13-r-md: 16px;
  --t13-r-sm: 12px;

  position: relative;
  background: var(--t13-bg);
  color: var(--t13-ink);
  font-family: var(--t13-font);
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: clip;
  transition: background-color 0.4s var(--t13-ease), color 0.4s var(--t13-ease);
}

/* Night (default mode): neutrals re-mapped with !important to beat saved inline palettes. */
.template13[data-mode="dark"] {
  --t13-ink: #f4f4f5 !important;
  --t13-muted: #9ea3ad !important;     /* 7.4:1 on bg */
  --t13-bg: #0a0a0b !important;
  --t13-surface: #111113 !important;
  --t13-card: #161618;
  --t13-card-2: #1c1c1f;
  --t13-dim: #5f636a;
  --t13-line: rgb(255 255 255 / 0.08);
  --t13-line-strong: rgb(255 255 255 / 0.16);
  --t13-text-accent: color-mix(in oklab, var(--t13-accent) 55%, white); /* default ≈ #b3abff, 8.9:1 */
  --t13-glass: rgb(255 255 255 / 0.08);
  --t13-glass-line: rgb(255 255 255 / 0.14);
  --t13-ok: #61df84;
  --t13-warn: #f5b454;
  color-scheme: dark;
}

.t13-container { width: min(100% - 2 * var(--t13-gutter), var(--t13-max)); margin-inline: auto; }
.t13-serif { font-family: var(--t13-serif); font-weight: 400; letter-spacing: -0.02em; line-height: 1; }
.t13-h1 { font: 400 clamp(44px, 5.6vw, 76px)/1 var(--t13-serif); letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
.t13-h2 { font: 400 clamp(40px, 4.6vw, 64px)/1 var(--t13-serif); letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
.t13-h3 { font: 500 15px/1.35 var(--t13-font); margin: 0; }
.t13-lead { font-size: 14px; line-height: 1.65; color: var(--t13-muted); max-width: 36ch; margin: 18px 0 0; }
.t13-label { font: 600 11px/1 var(--t13-font); letter-spacing: 0.09em; text-transform: uppercase; color: var(--t13-muted); margin: 0 0 14px; }
.t13-mono { font-family: var(--t13-mono); font-size: 12px; letter-spacing: 0; }
.t13-section { padding-block: var(--t13-section); }
.t13-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Pills */
.t13-pill {
  display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 999px;
  font: 500 13px/1 var(--t13-font); border: 1px solid transparent; cursor: pointer; text-decoration: none;
  transition: transform 0.25s var(--t13-ease), background-color 0.25s, color 0.25s, border-color 0.25s;
}
.t13-pill:active { transform: scale(0.97); }
.t13-pill-solid { background: var(--t13-ink); color: var(--t13-bg); }
.t13-pill-solid:hover { background: color-mix(in srgb, var(--t13-ink) 86%, var(--t13-bg)); }
.t13-pill-white { background: #fff; color: #0a0a0b; }               /* on photos / night, 19:1 */
.t13-pill-glass {
  background: var(--t13-glass); color: inherit; border-color: var(--t13-glass-line);
  backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%);
}
.t13-pill-lg { height: 52px; padding: 0 24px; font-size: 14px; }
.template13 :focus-visible { outline: 2px solid var(--t13-text-accent); outline-offset: 3px; border-radius: 8px; }
```

Remove these old variables, and replace each use with the new name (search the CSS): `--t13-black`, `--t13-on-dark*`, `--t13-btn-*`, `--t13-band`, `--t13-lead`, `--t13-display`, `--t13-radius`. Old component rules still referencing them get rewritten in A3–A8. To keep the page readable until then, add temporary aliases at the end of the block, marked `/* TEMP aliases — removed in A9 */`: `--t13-black: var(--t13-night); --t13-lead: var(--t13-muted); --t13-display: var(--t13-serif);`.

- [ ] **Step 5: Run tests, typecheck and a visual smoke check**

Run: `npm test` and `npm run typecheck`. Expected: PASS.
Then preview `/dev/templates/t13` (preview_start, dev server). Expected: dark page, serif headings, no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/templates/template13/template13.css src/templates/template13/Template13.tsx src/lib/templateTheme.ts src/templates/meta.ts tests/shopTemplates.test.mjs
git commit -m "t13: cinematic dark tokens, Instrument Serif + Inter + JetBrains Mono"
```

## Task A2: Pure helpers (`template13/lib.ts`)

**Files:**
- Create: `src/templates/template13/lib.ts`
- Test: `tests/t13Lib.test.mjs`

**Interfaces:**
- Produces:
  - `matchesQuery(p: { name: string; description: string | null }, categoryName: string | null, q: string): boolean`
  - `typewriterStep(s: TypeState, phrases: string[]): TypeState` where `TypeState = { i: number; len: number; dir: 1 | -1; hold: number }`, and `typewriterText(s, phrases): string`
  - `litCount(progress: number, total: number): number`
  - `pickMarquee<T extends { id: string; featured: boolean }>(items: T[], min = 8): T[]`
  - `initials(name: string): string`
  - `splitChars(text: string): string[]`

- [ ] **Step 1: Write the failing tests**

```js
// tests/t13Lib.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesQuery, typewriterStep, typewriterText, litCount, pickMarquee, initials, splitChars } from "../src/templates/template13/lib.ts";

test("matchesQuery: every word must hit name, description or category", () => {
  const p = { name: "Linen co-ord set", description: "Breathable two-piece" };
  assert.equal(matchesQuery(p, "Sets", "linen"), true);
  assert.equal(matchesQuery(p, "Sets", "linen two"), true);
  assert.equal(matchesQuery(p, null, "silk"), false);
  assert.equal(matchesQuery(p, null, "   "), true);
  assert.equal(matchesQuery(p, "Sets", "SETS"), true);
});

test("typewriter types, holds, deletes, then moves to next phrase", () => {
  const phrases = ["ab", "c"];
  let s = { i: 0, len: 0, dir: 1, hold: 0 };
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "a");
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "ab");
  s = typewriterStep(s, phrases); assert.equal(typewriterText(s, phrases), "ab"); // holding
  let guard = 0;
  while (s.i !== 1 && guard++ < 100) s = typewriterStep(s, phrases); // finish hold, delete, advance
  assert.equal(s.i, 1);
  assert.equal(s.len, 0);
  assert.ok(guard < 100);
});

test("typewriter survives an empty list", () => {
  const s = typewriterStep({ i: 0, len: 0, dir: 1, hold: 0 }, []);
  assert.equal(typewriterText(s, []), "");
});

test("litCount clamps and rounds", () => {
  assert.equal(litCount(-1, 10), 0);
  assert.equal(litCount(0.5, 10), 5);
  assert.equal(litCount(2, 10), 10);
});

test("pickMarquee puts featured first and repeats to reach the minimum", () => {
  const items = [{ id: "a", featured: false }, { id: "b", featured: true }, { id: "c", featured: false }];
  const out = pickMarquee(items, 8);
  assert.equal(out[0].id, "b");
  assert.ok(out.length >= 8);
  assert.deepEqual(pickMarquee([], 8), []);
});

test("initials and splitChars", () => {
  assert.equal(initials("Ada Obi"), "AO");
  assert.equal(initials("  zara "), "Z");
  assert.equal(initials(""), "·");
  assert.deepEqual(splitChars("a b"), ["a", " ", "b"]);
});
```

- [ ] **Step 2: Run them and check that they fail**

Run: `npm test`
Expected: FAIL, because `lib.ts` cannot be found.

- [ ] **Step 3: Implement**

```ts
// src/templates/template13/lib.ts
/** Pure helpers for template 13 (no React, no "@/" imports — loaded by the Node test runner). */

export function matchesQuery(p: { name: string; description: string | null }, categoryName: string | null, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${p.name} ${p.description ?? ""} ${categoryName ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export type TypeState = { i: number; len: number; dir: 1 | -1; hold: number };
const HOLD_TICKS = 14; // ≈ 1.6 s at the composer's 110 ms tick while holding

/** One tick of the composer placeholder: type → hold → delete → next phrase. */
export function typewriterStep(s: TypeState, phrases: string[]): TypeState {
  if (!phrases.length) return { i: 0, len: 0, dir: 1, hold: 0 };
  const word = phrases[s.i % phrases.length] ?? "";
  if (s.dir === 1) {
    if (s.len < word.length) return { ...s, len: s.len + 1 };
    if (s.hold < HOLD_TICKS) return { ...s, hold: s.hold + 1 };
    return { ...s, dir: -1, hold: 0 };
  }
  if (s.len > 0) return { ...s, len: s.len - 1 };
  return { i: (s.i + 1) % phrases.length, len: 0, dir: 1, hold: 0 };
}

export function typewriterText(s: TypeState, phrases: string[]): string {
  if (!phrases.length) return "";
  return (phrases[s.i % phrases.length] ?? "").slice(0, s.len);
}

/** How many characters of the statement are lit for a scroll progress 0..1. */
export function litCount(progress: number, total: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(p * total);
}

/** Featured first, then the rest; repeated until the row is long enough to loop seamlessly. */
export function pickMarquee<T extends { id: string; featured: boolean }>(items: T[], min = 8): T[] {
  if (!items.length) return [];
  const ordered = [...items.filter((p) => p.featured), ...items.filter((p) => !p.featured)];
  const out: T[] = [];
  while (out.length < min) out.push(...ordered);
  return out;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "·";
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export function splitChars(text: string): string[] {
  return Array.from(text);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/templates/template13/lib.ts tests/t13Lib.test.mjs
git commit -m "t13: pure helpers for search, typewriter, char reveal, marquee"
```

## Task A3: Header with rolling labels, giant-wordmark footer

**Files:**
- Create: `src/templates/template13/components/RollText.tsx`
- Modify: `src/templates/template13/components/T13Header.tsx`
- Modify: `src/templates/template13/components/T13Footer.tsx`
- Modify: `src/templates/template13/template13.css` (header + footer blocks, replacing the old `.t13-header*` / `.t13-footer*` rules)

**Interfaces:**
- Consumes: `useT13()` (`navPages`, `baseUrl`, `cart`, `openCart`, `shop`, `mode`, `toggleMode`, `pageKind`, `profile`), and `splitChars` from `../lib`.
- Produces: `<RollText text="Shop" />`, a span that the A5/A8 tabs also use.

- [ ] **Step 1: RollText**

```tsx
// src/templates/template13/components/RollText.tsx
import type { CSSProperties } from "react";
import { splitChars } from "../lib";

/** Offloop-style rolling label: two stacked copies; letters slide up one by one on hover/focus of the parent link. */
export default function RollText({ text }: { text: string }) {
  const chars = splitChars(text);
  return (
    <span className="t13-roll" aria-label={text}>
      <span className="t13-roll-row" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties}>{c === " " ? " " : c}</span>
        ))}
      </span>
      <span className="t13-roll-row t13-roll-next" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties}>{c === " " ? " " : c}</span>
        ))}
      </span>
    </span>
  );
}
```

Note: write `" "` through a Node script or check after writing. The Write tool can turn the escape into a literal character (see constraints memory), and a literal NBSP is acceptable too.

- [ ] **Step 2: Header markup**

Restructure `T13Header` to this tree (keep the current mobile menu dialog, focus trap and nav-item building logic; only the markup and classes change):

```
<header class="t13-header" data-over-hero={pageKind==="home"} data-solid={scrolled}>
  <div class="t13-container t13-header-row">
    <Link class="t13-brand">[logo img 28px | mark ● + business name]</Link>
    <nav class="t13-nav" aria-label="Main"> each item: <Link class="t13-nav-link" aria-current>{<RollText text={label}/>}</Link>
       + "Shop" item first when shop is live
    </nav>
    <div class="t13-header-actions">
      <ModeToggle className="t13-icon-btn" .../>
      {shop ? <button class="t13-pill t13-pill-white t13-bag" onClick={openCart}>Bag <span class="t13-mono">{count}</span></button> : null}
      <button class="t13-icon-btn t13-menu-btn" aria-label="Menu">…</button>   (phones only)
    </div>
  </div>
</header>
```

`scrolled` is `window.scrollY > 40`, from a passive scroll listener held in `useState` and updated in rAF.

- [ ] **Step 3: Header CSS**

```css
.t13-header { position: fixed; inset: 0 0 auto; z-index: 40; height: 72px; display: flex; align-items: center;
  color: var(--t13-ink); transition: background-color .35s var(--t13-ease), border-color .35s, backdrop-filter .35s;
  border-bottom: 1px solid transparent; }
.t13-header[data-over-hero="true"]:not([data-solid="true"]) { color: #fff; }
.t13-header[data-solid="true"] { background: color-mix(in srgb, var(--t13-bg) 72%, transparent);
  backdrop-filter: blur(16px) saturate(140%); -webkit-backdrop-filter: blur(16px) saturate(140%); border-bottom-color: var(--t13-line); }
.t13-header-row { display: flex; align-items: center; gap: 24px; }
.t13-brand { display: inline-flex; align-items: center; gap: 8px; font: 600 15px/1 var(--t13-font); color: inherit; text-decoration: none; letter-spacing: -0.01em; }
.t13-brand img { height: 28px; width: auto; }
.t13-nav { margin-inline-start: auto; display: flex; gap: clamp(20px, 2.6vw, 36px); }
.t13-nav-link { font: 500 13px/18px var(--t13-font); color: inherit; opacity: .72; text-decoration: none; transition: opacity .25s; }
.t13-nav-link:hover, .t13-nav-link[aria-current="page"] { opacity: 1; }
.t13-header-actions { display: flex; align-items: center; gap: 10px; margin-inline-start: 18px; }
.t13-bag { height: 30px; padding: 0 14px; font-size: 13px; }
.t13-icon-btn { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 999px; border: 0; background: transparent; color: inherit; cursor: pointer; }
.t13-icon-btn:hover { background: var(--t13-glass); }

/* Rolling label */
.t13-roll { position: relative; display: inline-block; overflow: hidden; height: 18px; vertical-align: top; }
.t13-roll-row { display: block; white-space: nowrap; }
.t13-roll-row > span { display: inline-block; transition: transform .5s var(--t13-ease); transition-delay: calc(var(--i) * 14ms); }
.t13-roll-next { position: absolute; inset: 100% 0 auto; }
a:hover > .t13-roll .t13-roll-row > span, a:focus-visible > .t13-roll .t13-roll-row > span,
button:hover > .t13-roll .t13-roll-row > span { transform: translateY(-100%); }

@media (max-width: 860px) { .t13-nav { display: none; } .t13-menu-btn { display: grid; } }
@media (min-width: 861px) { .t13-menu-btn { display: none; } }
```

- [ ] **Step 4: Footer**

Markup:

```
<footer class="t13-footer">
  <div class="t13-container t13-footer-grid">
    <div class="t13-footer-brand"><p class="t13-footer-word">{business_name}</p><p class="t13-footer-tag">{tagline}</p></div>
    <nav> "Shop": categories (max 6) + "All products"
    <nav> "Company": navPages
    <nav> "Help": Size guide (if page), Contact, WhatsApp (if profile.whatsapp)
    <nav> "Connect": socials present on profile.socials (instagram, tiktok, x, facebook) + Email
  </div>
  <div class="t13-container t13-footer-base"><span>© {year} {name}. All rights reserved.</span><ModeToggle …/></div>
</footer>
```

CSS:

```css
.t13-footer { background: var(--t13-bg); border-top: 1px solid var(--t13-line); padding: 88px 0 28px; }
.t13-footer-grid { display: grid; grid-template-columns: 1.6fr repeat(4, 1fr); gap: 40px; }
.t13-footer-word { font: 400 clamp(56px, 7vw, 96px)/.9 var(--t13-serif); letter-spacing: -0.03em; margin: 0; }
.t13-footer-tag { margin: 22px 0 0; color: var(--t13-muted); font-size: 13px; max-width: 28ch; }
.t13-footer h3 { font: 500 13px/1 var(--t13-font); margin: 0 0 20px; letter-spacing: -0.01em; }
.t13-footer nav a { display: block; font-size: 13px; color: var(--t13-muted); text-decoration: none; padding: 6px 0; }
.t13-footer nav a:hover { color: var(--t13-ink); }
.t13-footer-base { margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--t13-line); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--t13-muted); }
@media (max-width: 900px) { .t13-footer-grid { grid-template-columns: 1fr 1fr; } .t13-footer-brand { grid-column: 1 / -1; } }
```

- [ ] **Step 5: Verify**

Run `npm run typecheck` and `npm run lint`. Then preview `/dev/templates/t13`:
- the header is white over the hero and turns frosted after scrolling;
- hovering a nav link rolls its letters;
- the bag pill shows the count and opens the drawer;
- at 375px the menu button shows and the dialog opens and closes with Esc.

Take a screenshot.

- [ ] **Step 6: Commit**

```bash
git add src/templates/template13/components src/templates/template13/template13.css
git commit -m "t13: rolling-label glass header and giant wordmark footer"
```

## Task A4: Heroes (home film still + beams, about, contact, extra, band)

**Files:**
- Modify: `src/templates/template13/sections/T13Hero.tsx`
- Modify: `src/templates/template13/template13.css` (all `.t13-hero*` rules, `.t13-banner*`)
- Modify: `src/templates/template13/icons.tsx` (add `IconSearch`, `IconArrowUp`, `IconPlus`, `IconSpark`, as 20px stroke-1.6 icons matching the existing style)

**Interfaces:**
- Consumes: `useT13()`, `shopHref`, `cityOf`, `useRouter` from `next/navigation`.

- [ ] **Step 1: Home hero markup** (replaces the final `return` in `T13Hero`)

```tsx
<section className="t13-hero t13-hero-home" data-photo={!!p0}>
  <div className="t13-hero-media" aria-hidden={!p0?.alt}>
    {p0 ? <img src={p0.url} alt={p0.alt || ""} loading="eager" fetchPriority="high" /> : null}
    <span className="t13-beams" aria-hidden="true"><i /><i /><i /><i /></span>
    <span className="t13-grain" aria-hidden="true" />
  </div>
  <div className="t13-hero-copy t13-container">
    <p className="t13-hero-kicker t13-mono">{city ? `${profile.business_name} — ${city}` : profile.business_name}</p>
    {title("t13-hero-title")}
    {lead("t13-hero-lead")}
    {shop ? (
      <form className="t13-hero-search t13-pill-glass" role="search" onSubmit={submit}>
        <label htmlFor="t13-hero-q" className="t13-sr">Search the collection</label>
        <input id="t13-hero-q" name="q" placeholder="Search the collection" autoComplete="off" />
        <button className="t13-pill t13-pill-white" type="submit">{ctaText || "Shop now"} <IconArrow size={16} /></button>
      </form>
    ) : showCta ? <div className="t13-actions">{cta("t13-pill t13-pill-white t13-pill-lg")}</div> : null}
    {shop ? <p className="t13-hero-micro">Secure checkout with Paystack{shop.settings.pickupEnabled ? " · Pickup available" : ""}</p> : null}
    {shop ? <a className="t13-hero-link" href="#t13-new-in">Explore what’s new</a> : null}
  </div>
</section>
```

`submit` does `router.push(`${shopHref(baseUrl)}?q=${encodeURIComponent(q)}`)`, or just the shop page when `q` is empty. In the editor (`enabled`), keep the existing `cta()` EditableText so the CTA label stays editable, and render the search form underneath it with `inert`.

- [ ] **Step 2: Home hero CSS (grade, beams, grain)**

```css
.t13-hero-home { position: relative; min-height: max(560px, 100svh); display: grid; align-items: end; color: #fff; isolation: isolate; background: var(--t13-night); }
.t13-hero-media { position: absolute; inset: 0; z-index: -1; overflow: hidden; }
.t13-hero-media img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.78) contrast(1.06) brightness(.82); transform: scale(1.06);
  animation: t13-drift 24s var(--t13-ease) infinite alternate; }
/* Blue cinematic grade + bottom fade into the page */
.t13-hero-media::before { content: ""; position: absolute; inset: 0; z-index: 1; mix-blend-mode: multiply;
  background: linear-gradient(180deg, rgb(20 52 110 / .55) 0%, rgb(14 34 78 / .55) 45%, rgb(6 12 28 / .9) 100%); }
.t13-hero-media::after { content: ""; position: absolute; inset: auto 0 0; height: 38%; z-index: 2;
  background: linear-gradient(180deg, transparent, var(--t13-bg)); }
.t13-hero-home:not([data-photo="true"]) .t13-hero-media { background: radial-gradient(120% 80% at 30% 0%, #23477e 0%, #0b1a33 45%, #05080f 100%); }
/* Volumetric beams from the top-left */
.t13-beams { position: absolute; inset: -20% -10% 0 -10%; z-index: 1; mix-blend-mode: screen; pointer-events: none; }
.t13-beams i { position: absolute; top: -10%; width: 22vw; height: 120%; transform-origin: top center;
  background: linear-gradient(180deg, rgb(200 225 255 / .55), rgb(160 200 255 / .12) 55%, transparent 80%);
  filter: blur(18px); opacity: .55; animation: t13-beam 14s ease-in-out infinite alternate; }
.t13-beams i:nth-child(1) { left: 6%;  transform: rotate(-28deg); }
.t13-beams i:nth-child(2) { left: 22%; transform: rotate(-22deg); width: 12vw; animation-delay: -4s; opacity: .4; }
.t13-beams i:nth-child(3) { left: 62%; transform: rotate(18deg);  width: 18vw; animation-delay: -7s; }
.t13-beams i:nth-child(4) { left: 78%; transform: rotate(24deg);  width: 10vw; animation-delay: -2s; opacity: .35; }
.t13-grain { position: absolute; inset: 0; z-index: 3; opacity: .07; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
@keyframes t13-beam { from { opacity: .25; translate: -2% 0; } to { opacity: .6; translate: 2% 0; } }
@keyframes t13-drift { to { transform: scale(1.12) translate3d(-1.5%, -1%, 0); } }

.t13-hero-copy { padding-bottom: clamp(56px, 11vh, 120px); text-align: center; display: grid; justify-items: center; }
.t13-hero-kicker { color: rgb(255 255 255 / .62); margin: 0 0 18px; text-transform: uppercase; letter-spacing: .08em; font-size: 11px; }
.t13-hero-title { font: 400 clamp(40px, 5.2vw, 76px)/1.02 var(--t13-serif); letter-spacing: -0.02em; margin: 0; max-width: 18ch; text-wrap: balance;
  text-shadow: 0 2px 30px rgb(0 10 30 / .35); }
.t13-hero-lead { margin: 16px 0 0; max-width: 46ch; color: rgb(255 255 255 / .74); font-size: 15px; line-height: 1.55; }
.t13-hero-search { margin-top: 28px; display: flex; align-items: center; gap: 8px; width: min(100%, 440px); height: 52px; padding: 0 6px 0 20px; border-radius: 999px; color: #fff; }
.t13-hero-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: #fff; font: 400 14px var(--t13-font); }
.t13-hero-search input::placeholder { color: rgb(255 255 255 / .62); }   /* 4.6:1 on the graded photo */
.t13-hero-search .t13-pill { height: 40px; }
.t13-hero-micro { margin: 14px 0 0; font-size: 11px; color: rgb(255 255 255 / .55); }
.t13-hero-link { margin-top: 14px; font: 500 13px var(--t13-font); color: #fff; text-decoration: none; border-bottom: 1px solid rgb(255 255 255 / .3); }
```

In paper mode the hero stays a night stage (`color:#fff`), but the bottom fade goes into the paper `--t13-bg`. That is deliberate: a film still fading into paper.

- [ ] **Step 3: Other hero variants**

All of them use the sticky-split vocabulary:
- **about**: `.t13-hero-about` is a 2-col grid (5/7) with `padding-top: 160px`. Left: label `About`, H1 (`t13-h1`), lead, pills (solid "Shop the collection", glass "Contact us"). Right: photo in a `--t13-r-lg` frame, aspect 4/5, with the same blue-grade overlay (`.t13-graded::before`, the same multiply gradient at 40% strength) and a glass caption chip bottom-left with the city in mono.
- **contact**: centred head (`padding-top:160px`), label + H1 + lead. Below it, a 2-col board. Left: `.t13-contact-lines` as feed cards (`--t13-card`, `--t13-r-md`, 1px line, 18px padding; 36px round icon tile `--t13-card-2`; `small` mono label; value 14/500). Right: an "Opening hours" card holding `T13Hours` in mono rows.
- **extra**: crumbs (mono 11 uppercase, `/` separators in `--t13-dim`), H1, lead, optional CTA. Below, a wide graded photo, aspect 21/9, `--t13-r-lg`.
- **plain** (any later hero = CTA band): a full-width container card, `--t13-r-lg`, background `--t13-night` with two beams (`.t13-beams` reused at 40% opacity), centred serif H2 in white (52px), lead white/70 and a white pill. 96px vertical padding.

- [ ] **Step 4: Verify**

Run `npm run typecheck`. Preview `/dev/templates/t13`, `/about`, `/contact` and `/p/lookbook` in both modes (toggle). Check:
- the beams drift slowly;
- the search pill submits to `/dev/templates/t13/shop?q=…`;
- with reduced motion emulated (JS `matchMedia` check, or add a temporary `data-motion` attribute), the beams are static.

Screenshot each hero.

- [ ] **Step 5: Commit**

```bash
git add src/templates/template13/sections/T13Hero.tsx src/templates/template13/icons.tsx src/templates/template13/template13.css
git commit -m "t13: cinematic film-still hero with light beams and glass search; page heroes"
```

## Task A5: Home commerce blocks: New-in feed, marquee, statement, studio window

**Files:**
- Delete: `src/templates/template13/sections/T13Looks.tsx`
- Create: `src/templates/template13/sections/T13NewIn.tsx`, `T13Marquee.tsx`, `T13Statement.tsx`, `T13Studio.tsx`
- Modify: `src/templates/template13/sections/T13Sections.tsx`
- Modify: `src/templates/template13/template13.css`

**Interfaces:**
- Consumes: `useT13()` (`shop`, `baseUrl`, `cart`, `announce`, `profile`, `openCart`); `pickMarquee`, `litCount`, `splitChars` from `../lib`; `ProductCard`, `PriceText` from `../shop/ProductCard`; `productHref`, `optionGroups`, `categoryName`, `quickAddTarget`-style logic (copy t14's `quickAddTarget` into t13 `shop/helpers.ts` if it is missing: same body); `formatNaira` from `@/lib/shop/money`.
- Mount order on home in `T13Sections`:
  - after the primary hero: `<T13NewIn/>` then `<T13Marquee/>`;
  - after all sections: `<T13Studio/>` then `<T13Statement/>`. The statement uses `profile.tagline`, else the first hero subtext; it is skipped when both are empty.

- [ ] **Step 1: `T13NewIn` (sticky split product feed)**

```
<section id="t13-new-in" class="t13-section t13-split" aria-labelledby="t13-newin-h">
  <div class="t13-container t13-split-grid">
    <div class="t13-split-side"><div class="t13-sticky">
      <p class="t13-label">New in</p>
      <h2 id="t13-newin-h" class="t13-h2">This week’s arrivals.</h2>
      <p class="t13-lead">{shop.products.length} pieces, ready to ship{city ? ` from ${city}` : ""}. Tap any piece to see it up close.</p>
      <Link class="t13-pill t13-pill-solid" href={shopHref}>View all <IconArrow/></Link>
    </div></div>
    <ol class="t13-feed">
      picks (featured first, max 6) → <li class="t13-feed-item t13-reveal" style={--d: index}>
        <article class="t13-feed-card">
          <header class="t13-feed-head"><span class="t13-avatar">{initials(category||name)}</span>
            <b>{categoryName ?? "New in"}</b><span class="t13-mono t13-dim">added {product.name}</span></header>
          <Link class="t13-feed-body" href={productHref}>
            <img 120×150 radius 12 /> <div><h3 class="t13-h3">{name}</h3>
              <p class="t13-mono t13-dim">{optionGroups summary e.g. "S · M · L — 3 colours"}</p>
              <PriceText/></div>
          </Link>
          <footer class="t13-feed-foot"><span class="t13-dot" data-state={in|low|out}/> {In stock | Only n left | Sold out}
            <button class="t13-pill t13-pill-glass t13-pill-sm" onClick={quickAdd}>Add to bag</button></footer>
        </article>
      </li>
    </ol>
  </div>
</section>
```

Quick add: when the product has no options, or exactly one in-stock variant, add it with `cart.add(...)` (the same call `ProductPage` uses) and then `announce("Added to your bag")`. Otherwise link to the product page ("Choose size").

CSS:

```css
.t13-split-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(32px, 6vw, 96px); }
.t13-sticky { position: sticky; top: 120px; }
.t13-feed { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.t13-feed-card { background: var(--t13-card); border: 1px solid var(--t13-line); border-radius: var(--t13-r-md); padding: 14px 16px; }
.t13-feed-head { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 12px; }
.t13-avatar { width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; font: 600 10px var(--t13-font); color: #0a0a0b;
  background: linear-gradient(135deg, #ffb27a, #ff7a59); }
.t13-feed-body { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; color: inherit; text-decoration: none;
  background: var(--t13-card-2); border-radius: var(--t13-r-sm); padding: 10px; }
.t13-feed-body img { width: 120px; aspect-ratio: 4/5; object-fit: cover; border-radius: 10px; transition: transform .8s var(--t13-ease); }
.t13-feed-body:hover img { transform: scale(1.04); }
.t13-feed-foot { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; color: var(--t13-muted); }
.t13-feed-foot .t13-pill { margin-inline-start: auto; height: 30px; padding: 0 12px; font-size: 12px; }
.t13-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--t13-ok); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t13-ok) 18%, transparent); }
.t13-dot[data-state="low"] { background: var(--t13-warn); } .t13-dot[data-state="out"] { background: var(--t13-dim); box-shadow: none; }
.template13[data-motion="on"] .t13-feed-item.t13-reveal { transition-delay: calc(var(--d) * 90ms); }
@media (max-width: 900px) { .t13-split-grid { grid-template-columns: 1fr; } .t13-sticky { position: static; } }
```

- [ ] **Step 2: `T13Marquee` (mono ticker cards)**

Render `pickMarquee(shop.products, 10)` twice inside one track (the second copy gets `aria-hidden`). Each card:

```
<Link class="t13-tick" href={productHref}>
  <span class="t13-tick-win">
    <span class="t13-tick-title"><IconChevronDown/> {name} <em class="t13-mono t13-dim">{n}/{n}</em></span>
    <code>SKU  {variant0.sku ?? product.slug.toUpperCase().slice(0,10)}</code>
    <code>Sizes  {sizes.join(" ")}</code>          (when a size option exists)
    <code class="t13-tick-price">{formatNaira(min)} {sale ? <s>{was}</s> : null}</code>
  </span>
  <span class="t13-tick-foot"><span class="t13-avatar">{initials}</span> {categoryName ?? "Mode"} <i>View piece</i></span>
</Link>
```

CSS:

```css
.t13-marquee { padding-block: 24px 72px; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); overflow: hidden; }
.t13-marquee-track { display: flex; gap: 14px; width: max-content; animation: t13-marquee 60s linear infinite; }
.t13-marquee:hover .t13-marquee-track, .t13-marquee:focus-within .t13-marquee-track { animation-play-state: paused; }
@keyframes t13-marquee { to { transform: translateX(-50%); } }
.t13-tick { flex: 0 0 290px; background: var(--t13-card); border: 1px solid var(--t13-line); border-radius: 18px; padding: 10px; color: inherit; text-decoration: none; }
.t13-tick-win { display: grid; gap: 4px; background: var(--t13-card-2); border-radius: 12px; padding: 12px; font: 400 12px/1.5 var(--t13-mono); color: var(--t13-muted); height: 104px; overflow: hidden;
  mask-image: linear-gradient(180deg, #000 70%, transparent); }
.t13-tick-title { font: 600 12px var(--t13-font); color: var(--t13-ink); display: flex; gap: 6px; align-items: center; }
.t13-tick-price { color: var(--t13-ink); } .t13-tick-price s { color: var(--t13-dim); margin-inline-start: 6px; }
.t13-tick-foot { display: flex; align-items: center; gap: 8px; padding: 10px 4px 2px; font: 500 13px var(--t13-font); }
.t13-tick-foot i { margin-inline-start: auto; font-style: normal; font-size: 12px; color: var(--t13-muted); }
```

- [ ] **Step 3: `T13Statement` (scroll-lit serif sentence)**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { litCount, splitChars } from "../lib";

/** Giant serif sentence whose letters light up as it crosses the viewport (Offloop's closing statement). */
export default function T13Statement({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  const chars = splitChars(text);
  const [lit, setLit] = useState(chars.length);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      setLit(litCount(progress, chars.length));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [chars.length]);
  return (
    <section ref={ref} className="t13-section t13-statement" aria-label={text}>
      <p className="t13-container t13-statement-text" aria-hidden="true">
        {chars.map((c, i) => <span key={i} data-lit={i < lit}>{c}</span>)}
      </p>
    </section>
  );
}
```

```css
.t13-statement-text { font: 400 clamp(44px, 6.4vw, 92px)/1.02 var(--t13-serif); letter-spacing: -0.02em; text-align: center; max-width: 20ch; margin-inline: auto; text-wrap: balance; }
.t13-statement-text span { color: var(--t13-ink); opacity: .14; transition: opacity .35s linear; }
.t13-statement-text span[data-lit="true"] { opacity: 1; }
```

- [ ] **Step 4: `T13Studio` (gradient band with a live mini-shop window)**

Layout:
- A full-bleed band with `padding: 96px 0` and the background below.
- Inside, a white "app window" (max 1100, radius 20, `box-shadow: 0 40px 120px -40px rgb(40 40 80 / .45)`, 1px `rgb(0 0 0 / .06)` border), always light themed whatever the mode, using fixed `#111113` / `#5d6069` text.

```css
.t13-studio { background:
    radial-gradient(60% 80% at 0% 0%, #f3d6c2 0%, transparent 60%),
    radial-gradient(60% 80% at 100% 100%, #b8cdf1 0%, transparent 60%),
    linear-gradient(110deg, #f1dccd 0%, #ece2ea 45%, #c9d8f2 100%); }
```

The window has three columns:
- sidebar 220px: a "Collections" header, then `# {category}` rows (13px, active row bg `#eef0f3` radius 8);
- product pane: a header bar with the category name, "{n} pieces" and tabs "Pieces · Details · Delivery" at 12px; under it a 2×2 grid of mini product tiles (radius 12, aspect 4/5);
- detail pane 300px: the selected product's big image radius 14, name 18/600, mono price, size chips, a black pill "Add to bag" (runs the same quick-add as the feed) and a small input-style "Ask about this piece" row that links to WhatsApp (`buildWhatsAppLink`) when `profile.whatsapp` is set.

Clicking a category filters the tiles; clicking a tile selects it. The state lives in `useState`.

On phones, the sidebar becomes horizontal chips and the detail pane stacks under the grid.

Heading above the window (centred, ink is always `#111113` because the band is light): label "The studio", serif H2 "Try it on, right here." (fixed copy).

- [ ] **Step 5: Verify**

Run `npm run typecheck` and `npm run lint`. Preview home in both modes and check:
- the feed cards stagger in and the left column sticks;
- the marquee loops seamlessly and pauses on hover;
- the statement lights up letter by letter while scrolling;
- the studio category clicks filter, and "Add to bag" updates the bag count and the screen-reader status.

Screenshot each block.

- [ ] **Step 6: Commit**

```bash
git add -A src/templates/template13/sections src/templates/template13/template13.css src/templates/template13/shop/helpers.ts
git commit -m "t13: new-in sticky feed, product marquee, studio window and scroll-lit statement"
```

## Task A6: Content sections in the Offloop vocabulary

**Files:**
- Modify: `src/templates/template13/sections/T13Services.tsx`, `T13Values.tsx`, `T13Testimonials.tsx`, `T13FAQ.tsx`, `T13Gallery.tsx`, `T13Team.tsx`, `T13RichText.tsx`, `T13BackedBy.tsx`, `T13UseCases.tsx`, `T13ContactCard.tsx`
- Modify: `src/templates/template13/template13.css`

Keep every `EditableText` / `useSectionEditor` hook-up, and any item add/remove controls, where they exist today. Only markup and classes change.

- [ ] **Step 1: Services**: sticky split with numbered rows.
  - Left sticky: label "Services", H2 `section items[0]`? No: use fixed "What we make." in paper/ink, because Services has no title field.
  - Right: `<ol class="t13-rows">`. Each item is a card (`--t13-card`, `--t13-r-md`, padding 22px 22px 22px 18px, grid `56px 1fr`) with a mono number `01` in `--t13-dim`, title 17/500 and desc 14 muted.
  - Hover: border goes to `--t13-line-strong` and the number to `--t13-text-accent`.
- [ ] **Step 2: Values**: icon tile grid.
  - Left sticky: H2 "What we stand for." plus a lead built from `items[0].desc`.
  - Right: a 4-col grid of square tiles (`aspect-ratio:1`, radius 20, gap 14).
  - Value tiles are filled, white in night mode and `#111113` in paper mode, with the value's first letter in serif 44px (black in night, white in paper), title 13/600 and a desc tooltip on focus/hover as a glass popover.
  - Filler tiles are empty `--t13-card` and pad the grid to a multiple of 4 (minimum 8 tiles), alternating as in Offloop: a value tile at positions 1, 3, 6, 8, 9, 11… Use `[1,0,1,0,0,1,0,1]` repeated, and put values into slots marked 1 in order.
  - Tiles fade in with `--d` stagger.
- [ ] **Step 3: Testimonials**: chat-transcript feed.
  - Left sticky: `section.title` (EditableText) as H2, with a lead "Notes from people who wear us." (fixed).
  - Right: messages. Each has a 28px avatar circle (initials on a gradient chosen by index from `[#ffb27a→#ff7a59, #a48eff→#6d5efc, #7ad7ff→#3d8bff, #9be7a8→#3fbf6a]`), name 12/600, role/company mono 11 dim, and a bubble (`--t13-card-2`, radius 14, padding 14 16) holding the quote at 14/1.6.
  - Every third message renders as a "system line": centred 12px muted, with "{name} joined from {company}" style chips. This only applies when `company` is set; otherwise skip it.
- [ ] **Step 4: FAQ**: numbered pill accordion. Centred, max 808.
  - Serif H1-sized title (`section.title`, 52px).
  - Lead "Quick answers about orders, sizing and delivery." Fixed, and only shown on shop sites.
  - Rows: `<details>` (`--t13-card`, radius 14, `min-height:56px`). The summary is a grid `48px 1fr 24px`: mono `01` dim, question 14/500, then a `+` that rotates 45° when open.
  - Answer: `grid-template-rows: 0fr → 1fr` (via the `::details-content` fallback: wrap the answer in a div and animate `max-height`), 14/1.65 muted, padding 0 18px 18px 66px.
  - Footer: "Still need help?" muted, plus the email link, or WhatsApp if no email.
- [ ] **Step 5: Gallery**: journal feature card plus masonry.
  - First image: a centred card (max 1000, `--t13-card`, radius 28, padding 22) with two columns. Left: serif title (`section.title`, 48px), mono line "{n} photographs" and tag chips (mono 11, 1px line, radius 999). Right: a tall image, aspect 3/4, radius 16, graded.
  - Remaining images: CSS columns (3, then 2 on tablet, then 1), radius 16, gap 14, with a mono caption from `alt` under each.
  - Clicking opens the existing lightbox, if T13Gallery has one; otherwise links to the image.
- [ ] **Step 6: Team** (cards on `--t13-card`, radius 16, photo aspect 4/5 graded, name serif 26px, role mono 11), **RichText** (max 720, H2 serif 44, body 16/1.75, links underlined in text-accent, `h3` in Inter 600), **BackedBy** (centred mono label "As seen in", logos at opacity .6 → 1 on hover, grayscale in night mode via `filter: invert(1) grayscale(1)` only when the logo is dark: keep simple and use `filter: grayscale(1)`), **UseCases** (bento of `--t13-card` tiles with serif titles and arrow links), **ContactCard** (form inputs `--t13-card-2`, radius 12, 48px tall, 1px line, focus ring text-accent; submit as a solid pill; map link as a glass pill).
- [ ] **Step 7: Verify**

Preview `/dev/templates/t13`, `/about`, `/contact` and every `/p/*` preset, in both modes and at 375 / 768 / 1440. Open the inline editor if available via the dev editor route (search `InlineEditorProvider` usage); otherwise rely on typecheck, since the `EditableText` wiring is unchanged. Run `npm run typecheck && npm run lint`.

- [ ] **Step 8: Commit**

```bash
git add src/templates/template13/sections src/templates/template13/template13.css
git commit -m "t13: services, values, testimonials, FAQ, gallery and more in the cinematic style"
```

## Task A7: Floating search composer + `?q=` on the shop list

**Files:**
- Create: `src/templates/template13/components/T13Composer.tsx`
- Modify: `src/templates/template13/Template13.tsx` (mount it after `<T13Footer/>`)
- Modify: `src/templates/template13/shop/ShopList.tsx`
- Modify: `src/templates/template13/template13.css`

**Interfaces:**
- Consumes: `typewriterStep`, `typewriterText`, `matchesQuery` from `../lib`; `useT13()`.
- Shows only when `shop` is set, `pageKind !== "shop"` (and on the shop list itself, too) and `!cartOpen`. Hidden on product, checkout and order views, where `shopView` is not a list.
- Pass `shopViewKind` into ctx (the same pattern as t14: add `shopViewKind: ShopView["kind"] | null` to `T13Ctx`, set it from `shopView?.kind ?? null`).

- [ ] **Step 1: Composer component**

```
<div class="t13-composer" data-show={visible}>
  <p class="t13-composer-hint"><span class="t13-composer-faces">{3 product thumbs 26px circles, overlapping −8px}</span>New pieces are ready when you are</p>
  <form class="t13-composer-bar" role="search" onSubmit={go}>
    <button type="button" class="t13-composer-plus" aria-label="Browse categories" aria-expanded={open} onClick={toggle}><IconPlus/></button>
    <label class="t13-sr" htmlFor="t13-composer-q">Search the shop</label>
    <input id="t13-composer-q" value={q} onChange placeholder={typed ? `Search “${typed}”` : "Search the shop"} autoComplete="off"/>
    <button type="submit" class="t13-composer-send" aria-label="Search"><IconArrowUp/></button>
    {open ? <ul class="t13-composer-menu" role="menu"> categories → Link to /shop/c/slug </ul> : null}
  </form>
  {q.trim() ? <ul class="t13-composer-results"> first 4 matchesQuery hits → thumb + name + mono price </ul> : null}
</div>
```

Behaviour:
- The typewriter phrases are the first 6 product names (featured first). It ticks every 70 ms while typing, 110 ms while holding and 35 ms while deleting (one `setTimeout` chain), and pauses while the input is focused or non-empty, or when reduced motion is on.
- `visible` becomes true once `scrollY > innerHeight * 0.7` on home, and is always true on the shop list. An `IntersectionObserver` on `.t13-footer` hides it while the footer is visible.
- Esc closes the menu and results. Results are keyboard reachable.
- Submitting goes to `/shop?q=`.

CSS:

```css
.t13-composer { position: fixed; z-index: 35; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); width: min(600px, calc(100% - 24px));
  transform: translate(-50%, 24px); opacity: 0; pointer-events: none; transition: opacity .4s var(--t13-ease), transform .5s var(--t13-ease); }
.t13-composer[data-show="true"] { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
.t13-composer-hint { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 0 10px; font-size: 13px; color: var(--t13-muted); }
.t13-composer-faces img { width: 26px; height: 26px; border-radius: 999px; object-fit: cover; border: 2px solid var(--t13-bg); margin-inline-start: -8px; }
.t13-composer-bar { position: relative; display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--t13-card-2) 88%, transparent); border: 1px solid var(--t13-line-strong);
  backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%); box-shadow: 0 24px 60px -24px rgb(0 0 0 / .6); }
.t13-composer-bar input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--t13-ink); font: 400 14px var(--t13-font); }
.t13-composer-bar input::placeholder { color: var(--t13-muted); }
.t13-composer-plus { width: 36px; height: 36px; border-radius: 999px; border: 0; background: transparent; color: var(--t13-ink); }
.t13-composer-send { width: 34px; height: 34px; border-radius: 999px; border: 0; background: var(--t13-ink); color: var(--t13-bg); display: grid; place-items: center; }
.t13-composer-menu, .t13-composer-results { position: absolute; bottom: calc(100% + 10px); left: 0; right: 0; list-style: none; margin: 0; padding: 8px;
  background: var(--t13-card); border: 1px solid var(--t13-line); border-radius: 18px; box-shadow: 0 30px 80px -30px rgb(0 0 0 / .6); }
```

When the composer is visible, add `padding-bottom: 120px` to `main`, so the bar never covers the last content.

- [ ] **Step 2: Shop list `?q=`**

In `ShopList`, read `q` from `window.location.search` on mount (the same pattern as t14 `ShopList.tsx:49-60`) into `useState`. Filter with `matchesQuery(p, categoryName(shop, p), q)`. Show a banner "Results for “q”" with a glass "Clear" pill that resets `q` and does `history.replaceState` to drop the param. The empty state reads "Nothing matches “q”. Try another word."

- [ ] **Step 3: Verify**

Preview home and scroll: the composer slides up after the hero, the placeholder types product names, typing shows live results, and Enter goes to `/shop?q=…` where the list is filtered. It hides at the footer and when the bag is open. Check at 375px. Run `npm run typecheck && npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/template13
git commit -m "t13: floating search composer with typing placeholder; shop list search"
```

## Task A8: Shop views (list, card, product, bag, checkout, order, size guide)

**Files:**
- Modify: `src/templates/template13/shop/ShopList.tsx`, `ProductCard.tsx`, `ProductPage.tsx`, `CartDrawer.tsx`, `CartLines.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `OrderPage.tsx`, `SizeGuide.tsx`
- Modify: `src/templates/template13/template13.css`

Logic stays untouched: variant selection, `optionAvailable`, stock, cart calls, checkout submit, order polling. Only markup and classes change.

- [ ] **Step 1: ShopList**
  - Header (`padding-top:140px`): mono crumbs, serif H1 "The collection" (or the category name) at 76px, and a mono count "{n} pieces" right-aligned on the same baseline.
  - Category tabs: a horizontally scrollable row of glass pills using `RollText`; the active pill is solid.
  - Sort: a glass pill holding a native `<select>`.
  - Grid: 3 cols, then 2 below 900px; gap 32px 16px.
- [ ] **Step 2: ProductCard**
  - Media: aspect 3/4, radius 14, bg `--t13-card`. The second image crossfades over 700ms with `scale(1.035)` on hover/focus.
  - Badge: a top-left mono pill (white bg, black text, 11px), "−20%" or "Sold out".
  - A quick-add round 36px white button bottom-right appears on hover (always visible on touch: `@media (hover: none)`), with the same quick-add rule as A5.
  - Under the media: name 14/500, then price in mono 13 muted (sale price ink, was-price struck in dim).
- [ ] **Step 3: ProductPage**
  - Layout: grid `7fr 5fr`, gap 48.
  - Left: an image stack. The first image is full width, aspect 4/5, radius 16; the rest go in a 2-col grid. Click to zoom (the existing behaviour, or none).
  - Right: a sticky panel (`top:96px`) containing:
    - mono crumbs and the category;
    - serif H1 48px;
    - mono price 18 with sale details;
    - a hairline;
    - option groups. Size values are 44px square chips (radius 10, 1px line; selected `bg: var(--t13-ink); color: var(--t13-bg)`; unavailable struck through with a diagonal line via `linear-gradient`). Colour values are 30px swatches with a ring when selected (`swatchColour`). Each group has a label row with the label as an uppercase 11px label, the selected value in mono, and "Size guide" as a text button that opens `SizeGuide`.
    - a stock line: `t13-dot` plus text;
    - quantity: a pill stepper;
    - "Add to bag" as a full-width white pill (night) or solid pill (paper), 52px tall;
    - a "Buy on WhatsApp" glass pill when `profile.whatsapp`;
    - accordions styled as the FAQ rows (01 Description, 02 Delivery & pickup from `shop.settings`, 03 Returns from the size-guide/faq content if present, otherwise omitted).
  - Below: "You may also like", the A5 marquee filtered to the same category, else all.
- [ ] **Step 4: CartDrawer / CartLines / CartPage**
  - Drawer: a right sheet 440px, `--t13-surface`, border-left line, slide-in 450ms `--t13-ease`; backdrop `rgb(0 0 0 / .5)` with blur 4.
  - Header: serif "Your bag" 34px and a mono count.
  - Lines: 72×90 thumb radius 10, name 14/500, variant mono 11, pill stepper 32px, mono price; remove is a text button.
  - Footer: subtotal row in mono 15, delivery note muted 12, a full-width 52px "Checkout" pill, and "Keep shopping" as a text button.
  - CartPage reuses the same lines in a 2-col layout with the summary card sticky.
- [ ] **Step 5: Checkout / Order**
  - Checkout: two columns (form 7 / summary 5).
    - Section headings serif 28px with a mono step number ("01 Contact", "02 Delivery", "03 Payment").
    - Inputs `--t13-card-2`, 48px tall, radius 12, 1px line; focus border text-accent with a ring.
    - The delivery/pickup choice is two radio cards (radius 14, 1px line; selected ring).
    - The summary card is `--t13-card`, radius 20, with lines, totals in mono, and the "Pay with Paystack" white pill.
  - Order:
    - centred, `padding-top:160px`, serif "Thank you, {firstName}." at 64px;
    - a mono reference chip;
    - a status timeline: four mono steps (Paid → Confirmed → Packed → On the way), the current one with an accent dot; only show the states the API provides, by mapping `payment`/`status` onto the steps; unknown statuses show just the status text;
    - the items table in mono.
- [ ] **Step 6: SizeGuide**: the drawer from the right (same shell as the bag) with a serif title. Its rich-text tables are styled with mono cells, a hairline grid, and a sticky first column on phones.
- [ ] **Step 7: Verify**

Walk `/dev/templates/t13/shop`, `/shop/c/<first category>`, `/shop/p/<a product with sizes>`, `/shop/cart`, `/shop/checkout` and `/shop/order/TEST` (get the slugs from `sampleShop("t13")` in `src/templates/sampleSite.ts`), in both modes and at 375 / 1440.
- Add a sized product to the bag, change quantity, remove it, open checkout, and toggle delivery/pickup.
- Check that the console has no errors (`read_console_messages`).
- Run `npm test && npm run typecheck && npm run lint`.

- [ ] **Step 8: Commit**

```bash
git add src/templates/template13
git commit -m "t13: cinematic shop list, product page, bag, checkout and order views"
```

## Task A9: Paper mode, motion, contrast and final QA

**Files:**
- Modify: `src/templates/template13/template13.css`

- [ ] **Step 1:** Delete the `TEMP aliases` and any rule that still references removed vars. Search `--t13-black|--t13-on-dark|--t13-btn-|--t13-band|--t13-lead|--t13-display|--t13-radius`; the expected match count is 0.
- [ ] **Step 2:** Add the reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .template13 *, .template13 *::before, .template13 *::after { animation: none !important; transition-duration: 0s !important; }
  .t13-statement-text span { opacity: 1 !important; }
  .t13-hero-media img { transform: none; }
}
```

- [ ] **Step 3:** Paper-mode pass. Toggle to light on every page and fix any pairing below 4.5:1. Known spots: the white pill on paper needs the solid variant (switch `.t13-pill-white` to solid inside `.template13:not([data-mode="dark"]) main` except on photos), the avatar text, and the studio band (always light, fine). Document the ratios in comments.
- [ ] **Step 4:** Use `javascript_tool` to check the computed contrast of `--t13-muted` on `--t13-bg` in both modes (≥4.5) and confirm that no element has a horizontal overflow at 375px (`document.documentElement.scrollWidth === innerWidth`).
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run lint`. All must pass. Take final screenshots of home (both modes), a product page and checkout.
- [ ] **Step 6: Commit**

```bash
git add src/templates/template13/template13.css
git commit -m "t13: paper mode, reduced motion and contrast pass"
```

---

# PART B — t14 "Cartly" × Norma (quiet, product-first store)

**Look in one line:** a white gallery, grey paper cards, black pills, two-tone headlines, glass islands floating over an inset photo, and a product configurator that feels like ordering a well-made object.

## Task B1: Tokens, fonts, metadata

**Files:**
- Modify: `src/templates/template14/template14.css`: replace the head through the end of the dark block
- Modify: `src/templates/template14/Template14.tsx` (`FONTS` stays Inter Tight + Inter; change the weights to `Inter+Tight:wght@500;600` and `Inter:wght@400;500;600`)
- Modify: `src/lib/templateTheme.ts:158-165`, `src/templates/meta.ts:18`
- Test: `tests/shopTemplates.test.mjs`

**Interfaces:**
- Produces the CSS vars that every later B-task uses:
  - `--t14-bg`, `--t14-paper`, `--t14-card`, `--t14-ink`, `--t14-muted`, `--t14-subtle`, `--t14-line`
  - `--t14-btn`, `--t14-btn-ink`, `--t14-accent`, `--t14-text-accent`
  - `--t14-glass`, `--t14-glass-line`, `--t14-glass-solid`
  - `--t14-night`, `--t14-on-night`, `--t14-on-night-2`
  - `--t14-font`, `--t14-display`, `--t14-ease`, `--t14-max`, `--t14-inset`, `--t14-r-xl`, `--t14-r-lg`, `--t14-r-md`, `--t14-ok`, `--t14-warn`, `--t14-sale`

- [ ] **Step 1: Test first**

```js
test("t14 Cartly is registered as a shop template", () => {
  assert.equal(templateSupportsShop("t14"), true);
  const meta = TEMPLATE_META.find((t) => t.key === "t14");
  assert.equal(meta?.name, "Cartly");
  assert.equal(meta?.shop, true);
  assert.match(meta?.description ?? "", /product-first/i);
  assert.equal(TEMPLATE_THEME_CONFIGS.t14.defaults.accent, "#2563eb");
  assert.equal(TEMPLATE_THEME_CONFIGS.t14.defaults.accent2, "#0a0a0a");
  assert.equal(TEMPLATE_THEME_CONFIGS.t14.defaults.surface, "#f5f5f5");
});
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Defaults**

```ts
  // General store — "Cartly" (quiet, product-first)
  t14: config("t14", {
    accent: "#2563eb",
    accent2: "#0a0a0a",
    ink: "#0a0a0a",
    muted: "#6b6b6b",
    bg: "#ffffff",
    surface: "#f5f5f5",
  }, { accent2: "Buttons & dark bands", surface: "Paper cards / panels" }),
```

Meta description: `"Online stores and retailers: a quiet, product-first storefront with rounded cards, a product configurator, search, cart and Paystack checkout. Light + dark modes."`

- [ ] **Step 4: Token block**

```css
/* Template 14 — "Cartly": general stores and retailers with an online shop.
   Quiet and product-first (after nor.ma): Inter Tight two-tone headlines over Inter, white + paper-grey
   surfaces, black pill buttons, inset 24px-radius photo bands, three floating glass header islands,
   a tabbed category showcase, glass stat tiles, a product spotlight and a configurator-style product page. */

.template14 {
  --t14-accent: #2563eb;
  --t14-accent2: #0a0a0a;
  --t14-ink: #0a0a0a;
  --t14-muted: #6b6b6b;      /* 5.3:1 on white, 4.9:1 on paper */
  --t14-bg: #ffffff;
  --t14-surface: #f5f5f5;

  --t14-paper: var(--t14-surface);
  --t14-card: #ffffff;
  --t14-subtle: #a1a1a1;     /* decorative and dimmed headline line (≥24px) only */
  --t14-line: color-mix(in srgb, var(--t14-ink) 8%, transparent);
  --t14-line-strong: color-mix(in srgb, var(--t14-ink) 18%, transparent);
  --t14-btn: var(--t14-accent2);
  --t14-btn-ink: #ffffff;
  --t14-text-accent: color-mix(in oklab, var(--t14-accent) 88%, black);
  --t14-glass: rgb(255 255 255 / 0.14);
  --t14-glass-line: rgb(255 255 255 / 0.2);
  --t14-glass-solid: rgb(255 255 255 / 0.82);
  --t14-night: #0a0a0a;
  --t14-on-night: #ffffff;
  --t14-on-night-2: rgb(255 255 255 / 0.68);  /* 9:1 on night */
  --t14-ok: #16a34a;
  --t14-warn: #b45309;
  --t14-sale: #b91c1c;

  --t14-font: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --t14-display: "Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif;
  --t14-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --t14-max: 1000px;
  --t14-inset: clamp(12px, 1.2vw, 16px);
  --t14-r-xl: 24px;
  --t14-r-lg: 20px;
  --t14-r-md: 16px;

  position: relative;
  background: var(--t14-bg);
  color: var(--t14-ink);
  font-family: var(--t14-font);
  font-size: 16px;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}

.template14[data-mode="dark"] {
  --t14-ink: #f5f5f5 !important;
  --t14-muted: #a1a1a1 !important;   /* 7.6:1 on bg */
  --t14-bg: #0a0a0a !important;
  --t14-surface: #141414 !important;
  --t14-card: #1a1a1a;
  --t14-subtle: #5c5c5c;
  --t14-line: rgb(255 255 255 / 0.08);
  --t14-line-strong: rgb(255 255 255 / 0.16);
  --t14-btn: #ffffff;
  --t14-btn-ink: #0a0a0a;
  --t14-text-accent: color-mix(in oklab, var(--t14-accent) 60%, white);
  --t14-glass-solid: rgb(20 20 20 / 0.78);
  color-scheme: dark;
}

.t14-container { width: min(100% - 40px, var(--t14-max)); margin-inline: auto; }
.t14-band { margin-inline: var(--t14-inset); border-radius: var(--t14-r-xl); overflow: hidden; }
.t14-paper { background: var(--t14-paper); }
.t14-h1 { font: 600 clamp(38px, 4.4vw, 56px)/1.02 var(--t14-display); letter-spacing: -0.03em; margin: 0; }
.t14-h2 { font: 600 clamp(28px, 2.8vw, 36px)/1.1 var(--t14-display); letter-spacing: -0.015em; margin: 0; text-wrap: balance; }
.t14-h3 { font: 600 22px/1.3 var(--t14-display); letter-spacing: -0.01em; margin: 0; }
.t14-dim { color: var(--t14-subtle); }
.t14-lead { font-size: 16px; color: var(--t14-muted); margin: 14px 0 0; max-width: 46ch; }
.t14-section { padding-block: clamp(64px, 8vw, 128px); }
.t14-pill { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 999px;
  font: 600 14px/1 var(--t14-font); border: 0; cursor: pointer; text-decoration: none; transition: transform .3s var(--t14-ease), opacity .2s, background-color .2s; }
.t14-pill:active { transform: scale(.97); }
.t14-pill-black { background: var(--t14-btn); color: var(--t14-btn-ink); }
.t14-pill-white { background: #fff; color: #0a0a0a; }
.t14-pill-glass { background: var(--t14-glass); color: #fff; border: 1px solid var(--t14-glass-line); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.t14-pill-soft { background: var(--t14-paper); color: var(--t14-ink); }
.t14-pill-lg { height: 52px; padding: 0 28px; font-size: 15px; }
.t14-pill-block { width: 100%; }
.t14-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; font: 500 12px/1 var(--t14-font); background: var(--t14-paper); color: var(--t14-ink); }
.template14 :focus-visible { outline: 2px solid var(--t14-text-accent); outline-offset: 3px; }
```

Keep temporary aliases for old names until B8: `--t14-radius: var(--t14-r-md); --t14-black: var(--t14-night); --t14-btn-bg: var(--t14-btn);`.

- [ ] **Step 5:** Run `npm test && npm run typecheck`. Expected: PASS. Then a smoke preview of `/dev/templates/t14`.
- [ ] **Step 6: Commit**

```bash
git add src/templates/template14/template14.css src/templates/template14/Template14.tsx src/lib/templateTheme.ts src/templates/meta.ts tests/shopTemplates.test.mjs
git commit -m "t14: quiet product-first tokens (white, paper, black pills)"
```

## Task B2: Pure helpers (`template14/lib.ts`)

**Files:**
- Create: `src/templates/template14/lib.ts`
- Test: `tests/t14Lib.test.mjs`

**Interfaces:**
- Produces:
  - `splitTwoTone(headline: string): [string, string]`: returns the dimmed first part and the strong second part.
  - `parseStat(title: string): { prefix: string; value: number; decimals: number; suffix: string } | null`
  - `formatStat(s, value: number): string`
  - `bestValueVariantId(variants: Array<{ id: string; priceKobo: number | null }>, basePrice: number, compareAt: number | null): string | null`
  - `savingKobo(price: number, compareAt: number | null): number`

- [ ] **Step 1: Failing tests**

```js
// tests/t14Lib.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTwoTone, parseStat, formatStat, bestValueVariantId, savingKobo } from "../src/templates/template14/lib.ts";

test("splitTwoTone: explicit line break wins", () => {
  assert.deepEqual(splitTwoTone("Cut your screen time.\nIn one scan."), ["Cut your screen time.", "In one scan."]);
});
test("splitTwoTone: first sentence, else near the middle word", () => {
  assert.deepEqual(splitTwoTone("Everyday goods. Delivered fast."), ["Everyday goods.", "Delivered fast."]);
  assert.deepEqual(splitTwoTone("Fresh groceries delivered to your door"), ["Fresh groceries delivered", "to your door"]);
  assert.deepEqual(splitTwoTone("Shop"), ["", "Shop"]);
  assert.deepEqual(splitTwoTone(""), ["", ""]);
});

test("parseStat reads numbers with prefix/suffix and separators", () => {
  assert.deepEqual(parseStat("2,000+ orders"), { prefix: "", value: 2000, decimals: 0, suffix: "+ orders" });
  assert.deepEqual(parseStat("₦0 delivery"), { prefix: "₦", value: 0, decimals: 0, suffix: " delivery" });
  assert.deepEqual(parseStat("4.9 rating"), { prefix: "", value: 4.9, decimals: 1, suffix: " rating" });
  assert.equal(parseStat("Fast delivery"), null);
});
test("formatStat keeps separators and decimals", () => {
  const s = parseStat("2,000+ orders");
  assert.equal(formatStat(s, 1234.4), "1,234+ orders");
  assert.equal(formatStat(parseStat("4.9 rating"), 4.9), "4.9 rating");
});

test("bestValueVariantId: biggest saving vs compare-at, only if >1 variant saves", () => {
  const v = [{ id: "a", priceKobo: 900000 }, { id: "b", priceKobo: 1700000 }, { id: "c", priceKobo: null }];
  assert.equal(bestValueVariantId(v, 1000000, 1800000), "a");
  assert.equal(bestValueVariantId([{ id: "a", priceKobo: null }], 1000, 2000), null);
  assert.equal(bestValueVariantId(v, 1000000, null), null);
});
test("savingKobo never negative", () => {
  assert.equal(savingKobo(800, 1000), 200);
  assert.equal(savingKobo(1200, 1000), 0);
  assert.equal(savingKobo(1000, null), 0);
});
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
// src/templates/template14/lib.ts
/** Pure helpers for template 14 (no React, no "@/" imports — loaded by the Node test runner). */

/** Norma-style two-tone headline: [dimmed lead-in, strong finish]. */
export function splitTwoTone(headline: string): [string, string] {
  const h = headline.trim();
  if (!h) return ["", ""];
  const nl = h.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (nl.length > 1) return [nl[0]!, nl.slice(1).join(" ")];
  const sentence = h.match(/^(.+?[.!?])\s+(.+)$/);
  if (sentence) return [sentence[1]!, sentence[2]!];
  const words = h.split(/\s+/);
  if (words.length < 2) return ["", h];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export type Stat = { prefix: string; value: number; decimals: number; suffix: string };

export function parseStat(title: string): Stat | null {
  const m = title.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2]!.replace(/,/g, "");
  const decimals = raw.includes(".") ? raw.split(".")[1]!.length : 0;
  return { prefix: m[1]!, value: Number(raw), decimals, suffix: m[3]! };
}

export function formatStat(s: Stat, value: number): string {
  const n = value.toLocaleString("en-US", { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals });
  return `${s.prefix}${n}${s.suffix}`;
}

export function savingKobo(price: number, compareAt: number | null): number {
  return compareAt !== null && compareAt > price ? compareAt - price : 0;
}

/** Variant with the biggest saving against compare-at; null unless at least two variants exist and one saves. */
export function bestValueVariantId(
  variants: Array<{ id: string; priceKobo: number | null }>,
  basePrice: number,
  compareAt: number | null,
): string | null {
  if (variants.length < 2 || compareAt === null) return null;
  let best: { id: string; save: number } | null = null;
  for (const v of variants) {
    const save = savingKobo(v.priceKobo ?? basePrice, compareAt);
    if (save > 0 && (!best || save > best.save)) best = { id: v.id, save };
  }
  return best?.id ?? null;
}
```

Note: the `parseStat("4.9 rating")` test expects `value 4.9`, which the regex returns.

- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/templates/template14/lib.ts tests/t14Lib.test.mjs
git commit -m "t14: pure helpers for two-tone headlines, stats and best-value variants"
```

## Task B3: Three-island glass header, footer, floating deals pill

**Files:**
- Modify: `src/templates/template14/components/T14Header.tsx`
- Modify: `src/templates/template14/components/T14Footer.tsx`
- Create: `src/templates/template14/components/T14FloatPill.tsx`
- Modify: `src/templates/template14/Template14.tsx` (mount `T14FloatPill` after the footer, only when `shop` and `shopViewKind` are not `checkout` or `order`)
- Modify: `src/templates/template14/template14.css`

**Interfaces:**
- Consumes: the existing `useT14()` fields (`query`, `setQuery`, `shopViewKind`, `cart`, `openCart`, `mode`, `toggleMode`, `navPages`, `shop`, `pageKind`); `useCategoryLinks`, `MobileMenu` and `useFocusTrap` (kept); `dealProducts`.

- [ ] **Step 1: Header markup**

```
<header class="t14-header" data-tone={overPhoto && !scrolled ? "glass" : "solid"}>
  <div class="t14-container t14-header-row">
    <Link class="t14-island t14-brand">{logo 22px | NAME uppercase}</Link>
    <nav class="t14-island t14-nav" aria-label="Main">
      {shop ? <Link><IconBag/> Shop</Link>}
      {shop && cats.length ? <button aria-expanded onClick={toggleMega}><IconGrid/> Categories <IconChevronDown/></button>}
      {deals ? <Link href=/shop?sale=1><IconTag/> Deals</Link>}
      {navPages… each with a small line icon (About → IconInfo, Contact → IconPhone, extras → IconDoc)}
    </nav>
    <div class="t14-island t14-actions">
      <button class="t14-icon" aria-label="Search" onClick={openSearch}><IconSearch/></button>
      <ModeToggle className="t14-icon" …/>
      {shop ? <button class="t14-pill t14-pill-black t14-bagpill" onClick={openCart}>Bag <b>{count}</b></button>}
    </div>
  </div>
  {megaOpen ? <div class="t14-mega t14-container">category grid cards: name, count, first product thumb</div>}
  {searchOpen ? <form class="t14-searchsheet" role="search"> big 56px pill input + results (reuse current submitSearch) </form>}
</header>
```

`overPhoto` is `pageKind === "home"` and the primary hero has a photo; pass it via a `data-hero-photo` attribute on the root that T14Hero sets (ctx boolean `heroPhoto`). `scrolled` becomes true when `scrollY > innerHeight * 0.6`.

- [ ] **Step 2: Header CSS**

```css
.t14-header { position: fixed; inset: 12px 0 auto; z-index: 40; pointer-events: none; }
.t14-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.t14-island { pointer-events: auto; display: inline-flex; align-items: center; gap: 4px; height: 40px; padding: 0 6px; border-radius: 999px;
  transition: background-color .4s var(--t14-ease), color .4s, border-color .4s; border: 1px solid transparent; }
.t14-header[data-tone="glass"] .t14-island { background: var(--t14-glass); border-color: var(--t14-glass-line); color: #fff;
  backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%); }
.t14-header[data-tone="solid"] .t14-island { background: var(--t14-glass-solid); border-color: var(--t14-line); color: var(--t14-ink);
  backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%); box-shadow: 0 8px 30px -12px rgb(0 0 0 / .18); }
.t14-brand { padding: 0 16px; font: 600 15px/1 var(--t14-display); letter-spacing: .04em; text-transform: uppercase; text-decoration: none; }
.t14-nav a, .t14-nav button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 999px; border: 0; background: none;
  color: inherit; font: 500 13px/1 var(--t14-font); text-decoration: none; opacity: .86; cursor: pointer; }
.t14-nav a:hover, .t14-nav button:hover, .t14-nav [aria-current="page"] { opacity: 1; background: color-mix(in srgb, currentColor 10%, transparent); }
.t14-nav svg { width: 14px; height: 14px; }
.t14-icon { width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; border: 0; background: none; color: inherit; cursor: pointer; }
.t14-bagpill { height: 30px; padding: 0 14px; font-size: 13px; }
.t14-bagpill b { font-weight: 600; opacity: .7; }
.t14-mega { pointer-events: auto; margin-top: 8px; padding: 16px; background: var(--t14-card); border-radius: var(--t14-r-lg); box-shadow: 0 30px 80px -30px rgb(0 0 0 / .35);
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
@media (max-width: 860px) { .t14-nav { display: none; } }
```

- [ ] **Step 3: Footer**: max 1000.
  - Grid `1.6fr repeat(4, 1fr)`.
  - Brand column: NAME uppercase 18/600 Inter Tight; tagline 14 muted; a search pill (44px tall, 1px line, radius 999, input plus a black pill "Search" inside) that goes to `/shop?q=`; a mode chip.
  - Columns "Explore" (nav pages), "Shop" (categories), "Help" (contact, WhatsApp, delivery info page if any), "Follow" (socials). Headings 13/600 ink, links 13 muted, gap 10.
  - Bottom bar: hairline, then `© {year} {name}` at 12 subtle, with right links. `padding: 96px 0 40px`.
- [ ] **Step 4: `T14FloatPill`**: a fixed bottom-left pill (`left: 16px; bottom: 16px`, 40px tall, white with shadow `0 10px 30px -10px rgb(0 0 0 / .25)`, dark mode `--t14-card`). It holds a 24px black circle icon (`%` glyph) and the label:
  - "Deals · {n}", linking to `/shop?sale=1`, when deals exist;
  - else "Chat on WhatsApp", when `profile.whatsapp`;
  - else nothing.

  Hide it while the cart drawer is open. On phones, move it up above `StickyCartBar` when that is visible (`bottom: 84px`).
- [ ] **Step 5: Verify**

Preview home:
- the islands are glass over the photo and turn white-frosted past the hero;
- the categories mega opens and closes (Esc, outside click);
- the search sheet submits;
- the bag count is right;
- at 375px: brand + actions + menu only.

Run `npm run typecheck && npm run lint`.
- [ ] **Step 6: Commit**

```bash
git add src/templates/template14
git commit -m "t14: floating glass header islands, quiet footer, deals pill"
```

## Task B4: Heroes (inset photo card, page heroes, globe CTA band)

**Files:**
- Modify: `src/templates/template14/sections/T14Hero.tsx`
- Modify: `src/templates/template14/template14.css`

**Interfaces:**
- Consumes: `splitTwoTone` from `../lib`; `useT14()`; `formatNaira`.

- [ ] **Step 1: Home hero**

```
<section class="t14-hero" data-photo={!!p0}>
  <div class="t14-hero-card t14-band">
    {p0 ? <img class="t14-hero-img" …eager/> : null}
    <div class="t14-hero-shade" aria-hidden="true"/>
    <div class="t14-container t14-hero-inner">
      {shop ? <span class="t14-pill-glass t14-hero-chip">{deliveryChip}</span> : null}
      <div class="t14-hero-grid">
        <h1 class="t14-h1 t14-hero-title"><span class="t14-hero-dim">{a}</span>{a ? <br/> : null}<span>{b}</span></h1>
        <div><p class="t14-hero-lead">{subtext}</p>
          <div class="t14-hero-ctas">{cta("t14-pill t14-pill-white")}<a class="t14-pill t14-pill-glass" href="#t14-showcase">See what’s new</a></div></div>
      </div>
    </div>
    {shop ? <span class="t14-pill-glass t14-hero-status"><i/> {inStockCount} products in stock</span> : null}
  </div>
</section>
```

- `deliveryChip`: "Pickup available · Delivery from {formatNaira(fee)}". With fee 0 it reads "Free delivery"; without pickup, only the delivery part.
- In editor mode, the title is the existing multiline `EditableText` (the two-tone split is applied only when rendering read-only). Owners can type a line break to control the split, so tell them in the placeholder: `"Headline (press Enter for the dimmed first line)"`.

CSS:

```css
.t14-hero { padding-top: var(--t14-inset); }
.t14-hero-card { position: relative; height: calc(100svh - 2 * var(--t14-inset)); min-height: 600px; max-height: 900px; color: #fff; background: #1f1f1f; isolation: isolate; }
.t14-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; transform: scale(1.04); transition: transform 1.6s var(--t14-ease); }
.t14-hero-card:hover .t14-hero-img { transform: scale(1.06); }
.t14-hero-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(0 0 0 / .42) 0%, rgb(0 0 0 / .12) 42%, rgb(0 0 0 / .5) 100%); }
.t14-hero-inner { padding-top: clamp(120px, 18vh, 170px); }
.t14-hero-chip { display: inline-flex; height: 28px; padding: 0 12px; border-radius: 999px; font: 500 12px/28px var(--t14-font); }
.t14-hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 40px; margin-top: 18px; align-items: start; }
.t14-hero-title { color: #fff; }
.t14-hero-dim { color: rgb(255 255 255 / .55); }     /* large text, 3.4:1 on the shaded photo */
.t14-hero-lead { margin: 6px 0 0; font-size: 15px; line-height: 1.6; color: rgb(255 255 255 / .82); max-width: 40ch; }
.t14-hero-ctas { display: flex; gap: 8px; margin-top: 20px; }
.t14-hero-ctas .t14-pill { height: 36px; font-size: 13px; padding: 0 16px; }
.t14-hero-status { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); height: 36px; padding: 0 16px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 10px; font: 500 13px var(--t14-font); }
.t14-hero-status i { width: 7px; height: 7px; border-radius: 999px; background: #fff; box-shadow: 0 0 0 0 rgb(255 255 255 / .6); animation: t14-pulse 2.2s infinite; }
@keyframes t14-pulse { 70% { box-shadow: 0 0 0 10px rgb(255 255 255 / 0); } 100% { box-shadow: 0 0 0 0 rgb(255 255 255 / 0); } }
.t14-hero:not([data-photo="true"]) .t14-hero-card { background: radial-gradient(90% 70% at 70% 20%, #3a3a3a, #111 70%); }
@media (max-width: 820px) { .t14-hero-grid { grid-template-columns: 1fr; gap: 16px; } .t14-hero-card { min-height: 640px; } }
```

- [ ] **Step 2: Page heroes**
  - **about**: a paper inset band with `padding: 140px 0 72px`. Two columns: left the two-tone H1 (`.t14-hero-dim` becomes `color: var(--t14-subtle)` on paper) plus a lead plus a black pill; right a photo radius 24, aspect 4/5.
  - **contact**: centred two-tone H1 and lead (`padding-top:140px`). Below, a row of 4 contact cards (paper, radius 20, 20px padding): a 36px icon circle in white/card, a 12 muted label, a 15/600 value. Then the hours card on paper with hairline rows.
  - **extra**: crumbs as chips (`Home › Label`), the two-tone H1, a lead, and a wide photo band radius 24 aspect 21/9.
  - **plain** (later heroes): the **globe CTA band**. A `.t14-band` with background `linear-gradient(180deg, #262626, #0a0a0a)`, `padding: 120px 20px 160px`, centred. Behind the text sits an inline SVG globe (full width, an `<ellipse>` grid of 9 meridians and 6 parallels, stroke `rgb(255 255 255 / .09)`, strokeWidth 1, plus a big circle clipped at the bottom). On top: a glowing dot (an `accent` 18px circle inside a 40px white/20 ring) at about 25%/40%, with a beam (`conic-gradient` wedge, `accent` at 35% opacity, blurred 8px), slowly rotating 6s alternate. Then the H2 in white, centred, max 16ch, and a `.t14-pill-white` CTA with an arrow.
- [ ] **Step 3: Verify**

Preview home / about / contact / `/p/deals` and the later-hero CTA band, in both modes and at 375 / 1440. Run `npm run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/templates/template14
git commit -m "t14: inset photo hero with two-tone headline; page heroes; globe CTA band"
```

## Task B5: Home storefront blocks

**Files:**
- Delete: `src/templates/template14/sections/T14Storefront.tsx`
- Create: `src/templates/template14/sections/T14Strip.tsx`, `T14Feature.tsx`, `T14Showcase.tsx`, `T14Rail.tsx`, `T14Spotlight.tsx`
- Modify: `src/templates/template14/sections/T14Sections.tsx`, `template14.css`
- (`DealsStrip` is restyled in B7 and used by `T14Rail` when deals exist.)

**Interfaces:**
- Consumes: `useT14()`, `dealProducts`, `productHref`, `PriceText`/`ProductCard`, `quickAddTarget`, `categoryName`, `formatNaira`.
- Mount order on home in `T14Sections`:
  - after the primary hero: `<T14Strip/>`, `<T14Feature/>`, `<T14Showcase/>`;
  - after the content sections: `<T14Rail/>`, `<T14Spotlight/>`.
  - If the page has a later "plain" hero (the globe CTA), it keeps its position in the section order.
  - If the page has a `backed_by` section, T14Strip renders those logos instead of categories, and `T14BackedBy` returns null on home when the strip consumed it. Pass `stripUsesBackedBy` via the index (the first `backed_by` index) from `T14Sections`.

- [ ] **Step 1: `T14Strip`**: a white rounded top lip overlapping the hero.

```css
.t14-strip { position: relative; z-index: 2; margin: -32px var(--t14-inset) 0; background: var(--t14-bg); border-radius: var(--t14-r-xl) var(--t14-r-xl) 0 0; padding: 64px 0 24px; text-align: center; }
.t14-strip h2 { font: 600 24px/1.25 var(--t14-display); letter-spacing: -0.01em; max-width: 22ch; margin: 0 auto; }
.t14-strip-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 28px; }
```

Content:
- Categories mode: H2 "Everything you need, in one place." (fixed); then category chips `t14-chip` (40px tall, 14px, with the count `<small>` in muted), linking to category pages.
- Logos mode: H2 = `backed_by.title`, then logos (24px tall, grayscale, opacity .55).

- [ ] **Step 2: `T14Feature`**: split card plus carousel. It uses the first featured product, else the first product.
  - Left: a `.t14-paper` card, radius 24, `padding: 48px 44px`, flex column. Top: H2 two-line (product name + "." on line 1; for line 2, the category name dimmed). Then the description's first 160 chars in 15 muted. Pinned at the bottom: a `.t14-pill-black t14-pill-lg t14-pill-block` "Order → {formatNaira(price)}", linking to the product.
  - Right: a carousel radius 24, aspect 1 / 1.05. Images crossfade every 5s (paused on hover, and with reduced motion). A dot pager pill sits bottom-centre: background `rgb(255 255 255 / .7)` blur, 5px dots, the active one 16px wide, all buttons with `aria-label="Photo n"`.
  - Grid `1fr 1fr` gap 12 inside `.t14-container` (max 1000); stacked on phones.

- [ ] **Step 3: `T14Showcase`**: tabbed categories with a phone mockup. `id="t14-showcase"`; an inset `.t14-band.t14-paper`, `padding: 96px 0`.
  - Left column: H2 "Browse by what you need." (fixed), then chip tabs `role="tablist"`. Each tab is a 36px pill: white bg with a 1px line; selected `--t14-btn` with `--t14-btn-ink`; a 14px icon (IconGrid). Arrow-key navigation between tabs (roving tabindex).
  - Under the tabs, a caption that animates on change: H3 `{category}` + `"{n} products from {formatNaira(min)}"` muted.
  - Right column: the phone frame.

```css
.t14-phone { width: 300px; height: 600px; border-radius: 46px; background: #fff; border: 10px solid #111; box-shadow: 0 50px 100px -40px rgb(0 0 0 / .45), inset 0 0 0 1px rgb(0 0 0 / .06);
  overflow: hidden; position: relative; margin-inline: auto; color: #0a0a0a; }
.t14-phone::before { content: ""; position: absolute; top: 10px; left: 50%; translate: -50% 0; width: 92px; height: 26px; border-radius: 999px; background: #111; z-index: 2; }
.t14-phone-status { display: flex; justify-content: space-between; padding: 14px 26px 0; font: 600 12px var(--t14-font); }
.t14-phone-title { text-align: center; font: 600 13px var(--t14-display); letter-spacing: .04em; text-transform: uppercase; margin: 22px 0 12px; }
.t14-phone-list { list-style: none; margin: 0; padding: 0 14px; display: grid; gap: 8px; }
.t14-phone-list li a { display: grid; grid-template-columns: 44px 1fr auto; gap: 10px; align-items: center; padding: 8px; border-radius: 14px; background: #f5f5f5; color: inherit; text-decoration: none; font-size: 13px; }
.t14-phone-list img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background: #fff; }
.t14-phone-search { position: absolute; left: 14px; right: 14px; bottom: 16px; height: 38px; border-radius: 999px; background: #f0f0f0; display: flex; align-items: center; gap: 8px; padding: 0 14px; font-size: 13px; color: #6b6b6b; }
.t14-showcase-panel[data-swap="true"] { animation: t14-swap .45s var(--t14-ease); }
@keyframes t14-swap { from { opacity: 0; transform: translateY(8px); } }
```

  - Phone contents: the status bar (`9:41` plus signal glyphs as inline SVG), the store name, then the first 7 products of the active category (thumb, name truncated, mono-less price at 13/600), then a fake search row whose link goes to `/shop/c/{slug}`. The frame is decorative, but the links are real. The frame is always light whatever the mode.

- [ ] **Step 4: `T14Rail`**: product rail with arrows.
  - Head: H2 two-line "Popular right now.\nPicked by our customers." (dim second line), with a lead under it; on the right, two 40px round buttons (1px line, card bg) that scroll the rail by one card width (`scrollBy({ left: ±(cardWidth+12), behavior: "smooth" })`). They are disabled at the ends (scroll position checked on a `scroll` event).
  - Rail: `display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; padding-inline: max(20px, (100vw - 1000px)/2)`, so it bleeds to the right edge.
  - Cards are 300px wide `.t14-paper` cards, radius 24, padding 14:
    - the image area is white (dark: `#fff` too, so object shots stay clean), radius 16, aspect 1, `object-fit: contain`, padding 18;
    - then the name 17/600, then a meta chip line `"{category} · {n} options"` (n = variants length, else "1 option") in 13 muted;
    - the price 15/600;
    - hover lifts the image 4px.
  - Show deals first if `dealProducts` is non-empty, with the heading changed to "On sale now.\nWhile stock lasts." (only when deals ≥ 3); else featured, then popular.

- [ ] **Step 5: `T14Spotlight`**: object spotlight, full height, white.

```
<section class="t14-spot" aria-labelledby="t14-spot-h">
  <div class="t14-spot-stage"><span class="t14-spot-shadow"/><img class="t14-spot-obj" src={img} alt={alt} style={--s: scale}/></div>
  <h2 id="t14-spot-h" class="t14-h2">Order your {short name}.</h2>
  <Link class="t14-pill t14-pill-black t14-pill-lg" href={productHref}>Order <IconArrow/></Link>
</section>
```

  - Product: the first featured product with an image, preferring images with a white or transparent background (we cannot detect that, so take the first featured product).
  - `short name`: the first 3 words of the product name.
  - Scroll-linked scale 0.86 → 1 and rotate −6° → 0, from the section's progress through the viewport (the rAF pattern from A5 `T13Statement`, stored in the `--s`/`--r` CSS vars). There is also a gentle float (`translateY` ±8px over 6s).
  - The shadow is an ellipse, `radial-gradient(closest-side, rgb(0 0 0 / .22), transparent)`, 60% wide, under the object; it scales with the object.

```css
.t14-spot { min-height: 100svh; display: grid; place-items: center; align-content: center; gap: 28px; text-align: center; padding: 120px 20px; background: var(--t14-bg); }
.t14-spot-stage { position: relative; width: min(420px, 70vw); aspect-ratio: 1; display: grid; place-items: center; }
.t14-spot-obj { width: 100%; height: 100%; object-fit: contain; transform: scale(var(--s, 1)) rotate(var(--r, 0deg)); animation: t14-float 6s ease-in-out infinite alternate;
  filter: drop-shadow(0 30px 40px rgb(0 0 0 / .18)); }
.t14-spot-shadow { position: absolute; bottom: -4%; left: 20%; right: 20%; height: 14%; background: radial-gradient(closest-side, rgb(0 0 0 / .22), transparent); transform: scale(var(--s, 1)); }
@keyframes t14-float { to { translate: 0 -8px; } }
```

- [ ] **Step 6: Verify**

Preview home in both modes:
- the strip overlaps the hero with a rounded lip;
- the feature carousel cycles and the dots work;
- the showcase tabs switch with arrow keys and the phone content swaps;
- the rail arrows scroll and disable at the ends;
- the spotlight scales on scroll.

Check at 375 / 768 / 1440. Run `npm run typecheck && npm run lint`.
- [ ] **Step 7: Commit**

```bash
git add -A src/templates/template14/sections src/templates/template14/template14.css
git commit -m "t14: category strip, feature split, tabbed phone showcase, product rail, spotlight"
```

## Task B6: Content sections in the Norma vocabulary

**Files:**
- Modify: `src/templates/template14/sections/T14Services.tsx`, `T14Values.tsx`, `T14Testimonials.tsx`, `T14FAQ.tsx`, `T14Gallery.tsx`, `T14Team.tsx`, `T14RichText.tsx`, `T14BackedBy.tsx`, `T14UseCases.tsx`, `T14ContactCard.tsx`
- Modify: `src/templates/template14/template14.css`

Keep every editor hook-up.

- [ ] **Step 1: Services → "How it works" cards**
  - Centred H2 "How it works." (fixed, because there is no title field) and a lead "Three steps from browsing to your door." (fixed, shop sites only).
  - A 3-col grid (gap 12) of `.t14-paper` cards, radius 24, padding 28, `min-height: 380px`, flex column:
    - a 24px black number badge (`--t14-btn` / `--t14-btn-ink`, 12/600);
    - title 22/600 with `margin-top: 18px`;
    - desc 15 muted;
    - at the bottom, an image tile from `photos[i]` (radius 16, aspect 4/3, `margin-top: auto`), else an empty white tile with a large faded number.
  - More than 3 items wrap into rows of 3.
  - Under the grid, centred: a chip row "Or order by [WhatsApp] [Phone] [Instagram]" (only the channels the profile has, each a real link; the label "Or order by" in 14 subtle) and a black pill "Start shopping →".
- [ ] **Step 2: Values → glass stat tiles on a dark photo band**
  - An inset `.t14-band` with `min-height: 720px`. Background `photos[1]` cover with a `rgb(0 0 0 / .45)` overlay, else the `#262626 → #0a0a0a` gradient. It overlaps the previous block via `margin-top: -32px` only when it directly follows a paper band (skip the overlap otherwise, to keep it simple).
  - Grid `1fr 1fr`, `padding: 96px 56px`. Left: a white H2 "Why people shop with us." (fixed) and a lead from `items[0].desc`. Right: a 2×2 tile grid, gap 12.
  - Tiles: `background: rgb(255 255 255 / .1); backdrop-filter: blur(20px) saturate(140%); border: 1px solid rgb(255 255 255 / .14); border-radius: 20px; padding: 24px; min-height: 168px`.
  - Content: if `parseStat(title)` matches, show the number at 44/600 Inter Tight white, counting up from 0 on reveal (1200ms easeOutCubic, rAF, `formatStat`). Otherwise show the title at 22/600. Then the label (`desc`'s first line) 15/500 white, and the sub (the rest) 12 white/62.
  - More than 4 items: tiles flow into extra rows.
- [ ] **Step 3: Testimonials → reviews card**
  - An inset `.t14-band.t14-paper`, `padding: 72px 56px 0`, grid `1fr 1fr`. The right half is a grayscale `photos[2]` (`filter: grayscale(1) contrast(1.05)`) bleeding to the band edge, with radius only on the outer corners.
  - Left: decorative stars? **No** (no rating data). Instead a chip "{n} customer reviews", then the H2 `section.title` (EditableText) in two lines via `splitTwoTone` read-only, then a `.t14-pill-white` (dark: card) "Read all reviews", which opens a dialog listing every review.
  - The overlapping white card (`--t14-card`, radius 24, `box-shadow: 0 30px 60px -30px rgb(0 0 0 / .25)`, `margin: 48px 0 -48px`, z-index 2) holds 3 columns split by 1px lines, each with padding 24:
    - the quote at 16/1.5 clamped to 4 lines (`-webkit-line-clamp`);
    - a foot row: name 13 muted, then a `.t14-chip` "✓ {role || 'Customer'}", then a "Read all" text button that opens the dialog at that review.
  - Phones: the card is a horizontal snap scroller.
  - Add `margin-bottom: 72px` after the band to make room for the overlap.
- [ ] **Step 4: FAQ**
  - Centred, max 720. The H2 is `section.title` (default placeholder "Questions, answered.").
  - List with a 1px top border per row. The summary is 16/400 ink, 64px tall, with a chevron at the right that rotates 180° when open. The answer is 15/1.65 muted, `padding-bottom: 22px`, max 60ch.
  - Under the list: "Still stuck?" and a black pill "Contact us".
- [ ] **Step 5: Gallery → journal layout**
  - Head: H2 (`section.title`) left, and a "View all" soft pill right, which opens the lightbox.
  - Grid `1.35fr 1fr`, gap 24. Left: the big image, radius 20, aspect 16/11, with a `.t14-chip` overlay bottom-left (`alt` or "Photo 1") and a right chip "{n} photos".
  - Right: a list of the next 4 images as rows (`grid: 64px 1fr`, gap 14, `padding-block: 14px`, hairline between). Each row has a 64px radius-12 thumb, a small chip (the section title), and `alt` at 15/600 (fallback "Photo n").
  - Extra images (6+): a 4-col strip below, radius 16.
- [ ] **Step 6: Team** (paper cards radius 24, photo radius 16 aspect 1, name 17/600, role 13 muted), **RichText** (max 680; H2 Inter Tight 36; body 17/1.75 muted with ink `<strong>`; links ink underlined with offset 3px), **BackedBy** (when not consumed by the strip: centred 12px muted title and a grayscale logo row), **UseCases** (a 2-col bento of paper cards, radius 24, with an arrow pill link), **ContactCard** (a paper band; inputs white/card, 48px tall, radius 14, 1px line; focus border ink; submit a black pill block; map as a soft pill).
- [ ] **Step 7: Verify**

Preview all pages and presets (`/p/deals`, `/p/help`, about, contact) in both modes and at 375 / 1440. The stat count-up runs once and respects reduced motion. Run `npm run typecheck && npm run lint`.
- [ ] **Step 8: Commit**

```bash
git add src/templates/template14
git commit -m "t14: how-it-works cards, glass stats band, reviews card, FAQ, journal gallery"
```

## Task B7: Shop views (list, card, configurator product page, bag sheet, checkout, order)

**Files:**
- Modify: `src/templates/template14/shop/ShopList.tsx`, `ProductCard.tsx`, `ProductPage.tsx`, `CartDrawer.tsx`, `CartLines.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `OrderPage.tsx`, `DealsStrip.tsx`, `StickyCartBar.tsx`
- Modify: `src/templates/template14/template14.css`

**Interfaces:**
- Consumes: `bestValueVariantId`, `savingKobo` from `../lib`; the existing helpers `filterProducts`, `sortProducts`, `optionGroups`, `findVariant`, `optionAvailable`, `stockOf`, `quickAddTarget`. All filter/sort/cart logic stays identical.

- [ ] **Step 1: ShopList**
  - The page background is `--t14-paper`. Header (`padding-top: 120px`): H1 "Shop." (or "{category}.") and a lead `"{n} products{deliveryText}."`.
  - The filter rail becomes a sticky toolbar (`top: 64px`, z 5): a white/card pill bar, radius 999, padding 6, `box-shadow: 0 10px 30px -18px rgb(0 0 0 / .2)`, containing:
    - a search input pill (flex 1, bound to `query`/`setQuery`, unchanged);
    - a horizontally scrolling row of category chips (active black);
    - a "Filters" soft pill that opens a popover with the price range, "In stock" and "On sale" toggles (the same state vars as today);
    - a sort `<select>` styled as a soft pill.
  - Active filter chips render in a row below, as today (restyled `.t14-chip` with ×).
  - Grid: 3 cols, gap 12; 2 below 860; 2 on phones with gap 8.
- [ ] **Step 2: ProductCard**
  - `--t14-card` radius 24, padding 12.
  - Media: `--t14-paper` (dark: `#fff`), radius 16, aspect 1, `object-fit: contain`, padding 10%. The second image crossfades on hover.
  - Sale chip top-left: `"Save {formatNaira(saving)}"` on paper white, 12/600 in `--t14-sale`.
  - Quick-add: a 36px black circle bottom-right with `+` (it shows "Choose" via `aria-label` when options are needed).
  - Text, padded 6px 6px 4px: name 15/600 clamped to 2 lines, then a price row (price 15/600, was-price struck at 13 subtle).
  - Hover: `translateY(-2px)` and `box-shadow: 0 20px 40px -24px rgb(0 0 0 / .25)` over 400ms.
- [ ] **Step 3: ProductPage (Norma /shop configurator)**
  - Page background `--t14-paper`, `padding-top: 110px`.
  - Head: H1 `{name}.` (40/600), and a lead from the description's first sentence (16 muted, max 60ch).
  - Grid `1.05fr 1fr`, gap 16, align start.
  - **Gallery card**: `--t14-card` radius 24, aspect 1/1.1, the image `object-fit: contain` with padding 8%. Prev/next 32px white circles with a 1px line sit at the vertical centre left and right (hidden for a single image); swiping on touch uses pointer events with a 40px threshold. Below the card: a thumb row of 56px tiles, radius 12, 2px transparent border, the active one ink.
  - **Configurator card**: `--t14-card` radius 24, padding 24, sticky `top: 88px`.
    - Row 1: "Your {first 3 words}" 17/600 on the left; a stock chip on the right (dot + "In stock" / "Only {n} left" / "Sold out").
    - **Option rows**: if exactly one option group with ≤5 values, render radio cards (`role="radiogroup"`):

```css
.t14-opt { position: relative; display: grid; grid-template-columns: 1fr auto 22px; align-items: center; gap: 12px; min-height: 60px; padding: 12px 16px;
  border-radius: 16px; border: 1px solid var(--t14-line-strong); background: var(--t14-card); cursor: pointer; transition: border-color .2s, background-color .2s; }
.t14-opt[aria-checked="true"] { border: 1.5px solid var(--t14-ink); background: var(--t14-paper); }
.t14-opt[aria-disabled="true"] { opacity: .45; cursor: not-allowed; }
.t14-opt-name { font: 600 15px var(--t14-font); }
.t14-opt-sub { display: block; font: 400 12px var(--t14-font); color: var(--t14-muted); margin-top: 2px; }
.t14-opt-price { text-align: right; font: 600 15px var(--t14-font); }
.t14-opt-price s { font-weight: 400; color: var(--t14-subtle); margin-inline-end: 6px; }
.t14-opt-save { display: inline-block; margin-bottom: 4px; padding: 3px 8px; border-radius: 999px; background: var(--t14-paper); font: 600 11px var(--t14-font); }
.t14-opt-check { width: 22px; height: 22px; border-radius: 999px; border: 1.5px solid var(--t14-line-strong); display: grid; place-items: center; }
.t14-opt[aria-checked="true"] .t14-opt-check { background: var(--t14-ink); border-color: var(--t14-ink); color: var(--t14-bg); }
.t14-opt-tag { position: absolute; top: -9px; left: 14px; padding: 3px 9px; border-radius: 999px; background: var(--t14-ink); color: var(--t14-bg); font: 600 11px var(--t14-font); }
```

    - Each row shows: the value name; the sub line (variant SKU if set, else "Pickup or delivery"? No: show only the stock text when low); the price (the variant price or base), plus a struck compare-at and a "Save ₦X" chip when `savingKobo > 0`; and the tag "Best value" on `bestValueVariantId(...)`. Arrow keys move the selection (radio semantics).
    - Multiple option groups, or more than 5 values: segmented chips per group (a 40px pill grid, selected black), keeping the existing availability logic.
    - **Quantity**: a row "Quantity" with a pill stepper on the right (36px, − n +).
    - **Summary rows** (hairline above, 14px): "Delivery" with `formatNaira(fee)`, "Free", or "Pickup only"; "Pickup" with "Available" when `pickupEnabled`; then "Total" left (15/600) and right `formatNaira(unit*qty)` at 40/600 Inter Tight, `letter-spacing: -0.02em`. A small muted line under it: "Delivery added at checkout" when a fee exists.
    - A black block pill, 56px tall: "Add to bag →" (disabled state "Choose an option" or "Sold out").
    - **Status card**: 1px line, radius 16, padding 14 16. Dot + bold "In stock" / "Low stock", then the second line `Ships from ${city}` (only when there is an address city), else omitted.
    - When `profile.whatsapp`: a link under the card, "Questions? Chat on WhatsApp", at 13 muted, centred.
  - **Below the grid**:
    - a trust strip: one white/card pill bar (radius 999, 52px tall, centred items, gap 28, 13/500 with 16px icons) holding "Secure Paystack checkout", "Pickup available" (if), "Delivery from ₦X" (if fee), "WhatsApp support" (if);
    - a delivery card (white/card, radius 20): a top row of two cells split by a vertical line ("We deliver across Nigeria 🇳🇬" | "Pickup: {pickupNote}" when it exists), then a `<details>` "Delivery & returns" with `pickupNote` and fee info, and the size/returns FAQ when present;
    - "You may also like" as the B5 rail component, filtered to the same category.
- [ ] **Step 4: Bag sheet / CartLines / CartPage / StickyCartBar**
  - The drawer is a floating sheet: `position: fixed; top: 12px; right: 12px; bottom: 12px; width: min(440px, calc(100% - 24px)); border-radius: 24px; background: var(--t14-card)`. It slides in from the right (transform 420ms `--t14-ease`) over a backdrop `rgb(0 0 0 / .35)`.
  - Head: "Your bag" 22/600 and the count chip.
  - Lines: an 80px paper tile with a contain image, radius 14; name 15/600; variant 13 muted; stepper pill; price right.
  - Footer: subtotal and delivery rows, the big total at 28/600, and a black block pill "Checkout →".
  - CartPage: paper page with two white cards (lines | summary).
  - StickyCartBar (phones): a floating black pill `bottom: 12px; left: 12px; right: 12px`, 56px tall, "View bag · {n}" on the left and the subtotal on the right, white text.
- [ ] **Step 5: Checkout / Order**
  - Checkout: paper page.
    - Left: stacked white cards, radius 24, padding 28, each with a numbered black badge plus a title (22/600): "Contact", "Delivery", "Payment". Inputs are 48px tall, radius 14, `--t14-paper` bg, no border, 1.5px ink border on focus.
    - The delivery/pickup choice uses the `.t14-opt` radio cards from Step 3 (price on the right).
    - Right: the summary card in configurator style (lines, delivery, total at 32/600, a "Pay with Paystack" black block pill, and a "Secured by Paystack" line with a lock icon at 12 muted).
  - Order: centred white card, max 560, radius 24, padding 40.
    - A 56px black circle with a white check (it draws in via stroke-dashoffset 600ms), "Thank you, {firstName}." at 36/600 two-tone ("Thank you," dimmed), and the reference chip.
    - A status timeline as horizontal chips (done = black, current = outline + pulse, next = paper), using only API-backed states.
    - An items list, then totals.
    - "Continue shopping" as a soft pill.
- [ ] **Step 6: DealsStrip**: restyle as a B5 rail variant (paper cards with "Save ₦X" chips), with the same props.
- [ ] **Step 7: Verify**

Walk `/dev/templates/t14/shop`, a category, a product with one option group (radio cards), a product with two groups (chips), cart, checkout and order, in both modes and at 375 / 1440. Specifically:
- radio arrow keys move the selection;
- "Best value" appears only on the biggest saving;
- quick-add from the card works;
- the filters popover changes results;
- `?q=` and `?sale=1` still pre-filter.

Check the console for errors. Run `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 8: Commit**

```bash
git add src/templates/template14
git commit -m "t14: Norma-style configurator product page, quiet shop list, floating bag sheet, checkout and order"
```

## Task B8: Dark mode, motion, contrast and final QA

**Files:**
- Modify: `src/templates/template14/template14.css`

- [ ] **Step 1:** Remove the temporary aliases. Search for old variable names (`--t14-radius|--t14-black|--t14-btn-bg|--t14-on-dark|--t14-band|--t14-text-accent: #`); the expected count is 0 outside the token block.
- [ ] **Step 2:** Add the reduced-motion block (disable the float, pulse, carousel auto-advance (also checked in JS), count-up (JS check), spotlight transforms and hover lifts):

```css
@media (prefers-reduced-motion: reduce) {
  .template14 *, .template14 *::before, .template14 *::after { animation: none !important; transition-duration: 0s !important; }
  .t14-spot-obj, .t14-spot-shadow { transform: none !important; }
}
```

- [ ] **Step 3:** Dark-mode pass. On every page, check that the paper cards (`#141414`) sit on the `#0a0a0a` bg and are visible (line at 8%), that black pills flip to white, and that object images on white tiles stay white. The phone mockup and the spotlight stay light-on-white only if the spotlight bg follows `--t14-bg` (decide: in dark mode the spotlight bg is `#0a0a0a` with the object shadow lightened to `rgb(255 255 255 / .08)`).
- [ ] **Step 4:** Use `javascript_tool` to check that there is no horizontal overflow at 375px and that the contrast is ≥4.5 for `--t14-muted` on bg and on paper in both modes.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run lint`, all passing. Take final screenshots: home light/dark, product page, checkout.
- [ ] **Step 6: Commit**

```bash
git add src/templates/template14/template14.css
git commit -m "t14: dark mode, reduced motion and contrast pass"
```

---

## Final task: Cross-checks and memory

- [ ] **Step 1:** Run `npm test && npm run typecheck && npm run lint` on the merged branch.
- [ ] **Step 2:** Check that `src/lib/ai/templateChoice.ts` and the prompt builders (`src/lib/ai/prompts/*`) do not describe the old t13/t14 looks (grep `Italiana|terracotta|Cartly.*blue|deals strip`). Update any descriptive strings to the new descriptions in `meta.ts`.
- [ ] **Step 3:** Run `node tests/check-stock-photos.mjs` if the stock photo sets for fashion or retail are referenced by the templates. They are not changed here, so this is only a sanity check.
- [ ] **Step 4:** Update the memory file `template-redesign-plan.md` with rows for t13 (offloop.org, cinematic dark, Instrument Serif + Inter + JetBrains Mono, dark-first + paper) and t14 (nor.ma, quiet product-first, Inter Tight two-tone, light + dark).
- [ ] **Step 5:** Commit any string updates:

```bash
git commit -am "Describe the new Mode and Cartly looks in AI template choice"
```

---

## Self-review notes

- **Spec coverage:**
  - Every signature element in reference A maps to a task: 1→A3, 2→A4, 3→A5/A6, 4→A6 values, 5 bar chart (deliberately not used: there is no comparable store data, and the tile grid gives the same rhythm), 6→A6, 7→A5, 8→A5, 9→A6 gallery, 10→A5 studio, 11→A3, 12→A7.
  - Reference B: 1→B3, 2→B4, 3→B5 strip, 4→B5 feature, 5→B6 services, 6→B5 showcase, 7→B6 values, 8 not copied (made-up claims), 9→B6 testimonials, 10→B5 rail, 11→B5 spotlight, 12→B6 FAQ/gallery, 13→B4 globe band, 14→B3 footer, 15→B3 float pill, 16→B7 product page.
- **Contracts unchanged:** `TemplateProps`, section types, shop routes, cart and checkout calls.
- **Name consistency:** `splitTwoTone`, `parseStat`, `formatStat`, `bestValueVariantId`, `savingKobo` (B2→B4/B6/B7); `matchesQuery`, `typewriterStep`, `typewriterText`, `litCount`, `pickMarquee`, `initials`, `splitChars` (A2→A3/A5/A7); `resolveMode` / `useColorMode(fallback)` (Task 0→A1).
