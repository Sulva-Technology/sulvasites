# Category Templates (t7–t12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six new, visually distinct templates — t7 Tavola (restaurant), t8 Vital (clinic), t9 Pulse (fitness), t10 Campus (education), t11 Soirée (events), t12 Forge (trades).

**Architecture:** Each template is a self-contained directory `src/templates/templateN/` built on the same skeleton as `src/templates/template6/` (ctx provider, header/footer, one component per section type, scoped CSS with six palette vars, light/dark mode), registered in eight places. Tests are first made template-list-agnostic so every new template is checked automatically.

**Tech Stack:** Next.js 16 app router, React 19 client components, plain scoped CSS (no Tailwind inside templates), Google Fonts via `<TemplateFonts>`, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-03-category-templates-design.md` — the per-template design briefs (look, hero per page kind, how each section type renders, presets, fonts, palette) live there and are binding.

## Global Constraints

- Mirror t6's file layout: `TemplateN.tsx`, `ctx.tsx`, `icons.tsx`, `templateN.css`, `components/TNHeader.tsx`, `components/TNFooter.tsx`, `sections/TNSections.tsx`, and `sections/TN<Hero|Services|RichText|Values|ContactCard|BackedBy|UseCases|Gallery|Testimonials|FAQ|Team>.tsx`. Every section type in `src/lib/pageSchema.ts` must render.
- Read `src/templates/template6/` fully before starting (the reference implementation for props, ctx, inline editing via `useInlineEditor` + `src/templates/shared/edit.ts`, theme style via `buildTemplateThemeStyle` + `sanitizeThemeStyle`, `useColorMode`/`ModeToggle`, `galleryPhotos`, nav with `navPages`, contact form handling, `pageKind`). Reuse `src/templates/shared/*`; never import from another template's directory.
- `TemplateProps` (src/templates/registry.ts) and section data contracts are unchanged.
- Root class `.templateN`; all CSS selectors scoped under it. Define `--tN-accent, --tN-accent2, --tN-ink, --tN-muted, --tN-bg, --tN-surface` on `.templateN` with values exactly equal to the spec's default palette (lower-case hex). Derive lines/tints with `color-mix`.
- Dark mode: `.templateN[data-mode="dark"]` overrides with `!important` on the palette vars (beats saved inline palettes), toggle via `ModeToggle` in the header.
- Fonts: `<TemplateFonts href="https://fonts.googleapis.com/css2?family=…&display=swap" />`; never CSS `@import`.
- Distinct hero per `pageKind` (`home | about | contact | extra`).
- No invented facts or numbers in copy rendered by the template; labels/static UI strings are fine. Graceful fallbacks when there are no photos.
- Responsive down to 360px with no horizontal scroll; `prefers-reduced-motion` disables animation; visible focus styles; `<img>` with `alt`; buttons `type="button"` unless submitting.
- Footer credit: "Developed by Sulvatech" → https://sulvatech.com (use helpers in `src/templates/shared/links.ts` as t6 does).
- Existing source files are CRLF: edit them with the Edit tool (not sed/perl). New files may be LF.
- Verification per template: `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/templateN` clean. Commit message ends with a blank line + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Registration snippets (exact pattern, per template)

1. `src/templates/registry.ts`: `import TemplateN from "@/templates/templateN/TemplateN";` and `tN: TemplateN,` in `TEMPLATES`.
2. `src/templates/meta.ts`: `{ key: "tN", name: "<Name>", category: "<Category>", description: "<one sentence>" },`
3. `src/lib/templateTheme.ts`: `tN: config("tN", { accent, accent2, ink, muted, bg, surface }),` with the spec palette.
4. `src/templates/pagePresets.ts`: `tN: [ { key, label, headline, sections: [...] }, … ]` exactly as the spec's Presets line.
5. `src/templates/sampleSite.ts`: a `<category>Site()` sample (business name, tagline, profile contact fields, home/about/contact pages using every section type the template showcases, gallery images via `photoUrl()` from `src/lib/stockPhotos.ts` with ids from `STOCK_PHOTOS.<category>` and team photos from `PEOPLE_PHOTOS`) and wire it in `sampleSite(templateKey)`.
6. `src/lib/stockPhotos.ts` `TEMPLATE_CATEGORY`: `tN: "<category>"`.
7. `src/app/api/og/site/route.tsx` and `src/app/api/icon/site/route.tsx` `templateGradient`: a `case "tN":` gradient using the template's accent hues.
8. `tests/stockPhotos.test.mjs` "categoryForTemplate maps templates": `assert.equal(categoryForTemplate("tN"), "<category>");`

---

### Task 1: Make template tests list-agnostic + build t7 Tavola (restaurant)

**Files:**
- Modify: `tests/templateTheme.test.mjs`, `tests/pagePresets.test.mjs`
- Create: `src/templates/template7/**` (layout per Global Constraints)
- Modify: registration files 1–8

**Interfaces:**
- Produces: tests iterate `Object.keys(TEMPLATE_THEME_CONFIGS)` so later templates are covered automatically.

- [ ] **Step 1: Make tests iterate every configured template.** In `tests/templateTheme.test.mjs` replace both `for (const t of ["t1", "t2", "t3", "t4", "t5", "t6"])` with `for (const t of Object.keys(TEMPLATE_THEME_CONFIGS))`. In `tests/pagePresets.test.mjs` add `import { TEMPLATE_THEME_CONFIGS } from "../src/lib/templateTheme.ts";` and replace its loop list the same way.
- [ ] **Step 2: Add t7 to `templateTheme.ts` and `TEMPLATE_CATEGORY` (`t7: "food"`), and the categoryForTemplate assertion.** Run `npm test` — expected FAIL: `t7: --t7-accent not defined in CSS` and no t7 presets.
- [ ] **Step 3: Build `src/templates/template7/`** per the spec's "t7 Tavola" brief: Young Serif + Figtree; cream/oxblood palette `#b5452b / #2a1712 / #231815 / #75655c / #fbf6ee / #f2e8d9`; full-bleed food hero with info strip + "Reserve a table"/"View menu"; services as a two-column menu with dotted leaders; values as kitchen principles; masonry gallery with captions; guest pull-quotes; split about hero; contact hero with hours card + reservation form; candlelit dark mode.
- [ ] **Step 4: Register** (snippets 1, 2, 4, 5, 7) with name "Tavola", category "Restaurant", description "Restaurants, cafés, caterers and bakeries."; presets `menu` (Menu: hero, services, gallery, contact_card), `reservations` (Reservations: hero, richtext, faq, contact_card), `events` (Private dining: hero, richtext, gallery, contact_card); sample `restaurantSite()`.
- [ ] **Step 5: Verify** `npm test` all pass, `npx tsc --noEmit`, `npx eslint src/templates/template7` clean.
- [ ] **Step 6: Commit** "Add t7 Tavola restaurant template".

### Task 2: Build t8 Vital (clinic / health)

**Files:** Create `src/templates/template8/**`; modify registration files 1–8.

- [ ] **Step 1:** Add t8 to `templateTheme.ts` (`#0f8a7e / #0d2b33 / #10262c / #5d7178 / #ffffff / #eef6f4`), `TEMPLATE_CATEGORY` (`t8: "clinic"`) and the categoryForTemplate assertion. Run `npm test` — expected FAIL on t8 CSS vars / presets.
- [ ] **Step 2: Build `src/templates/template8/`** per the spec's "t8 Vital" brief: Plus Jakarta Sans; rounded 20px cards, mint surfaces; home hero with appointment card (service select from services titles → navigates to `${baseUrl}/contact?service=<title>`; the contact form prefills its message from `service`, as `src/templates/template5/sections/T5ContactCard.tsx` does); accreditation trust row from backed_by; icon service cards; "Why patients choose us" checklist from values; doctor cards from team; prominent FAQ accordion; contact hero with phone banner + hours; deep teal-navy dark mode.
- [ ] **Step 3: Register** snippets 1, 2, 4, 5, 7: name "Vital", category "Clinic & health", description "Clinics, dentists, pharmacies and wellness practices."; presets `services` (Treatments: hero, services, faq, contact_card), `doctors` (Our doctors: hero, team, testimonials, contact_card), `book` (Book a visit: hero, richtext, faq, contact_card); sample `clinicSite()`.
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/template8`.
- [ ] **Step 5: Commit** "Add t8 Vital clinic template".

### Task 3: Build t9 Pulse (fitness)

**Files:** Create `src/templates/template9/**`; modify registration files 1–8.

- [ ] **Step 1:** Add t9 to `templateTheme.ts` (`#e5322d / #0b0b0c / #111112 / #6a6a70 / #ffffff / #f2f2f3`), `TEMPLATE_CATEGORY` (`t9: "fitness"`), categoryForTemplate assertion. `npm test` — expected FAIL on t9.
- [ ] **Step 2: Build `src/templates/template9/`** per the spec's "t9 Pulse" brief: Anton display + Inter; dark full-bleed hero with giant condensed uppercase headline, "Start free trial" CTA, marquee of service titles (static under reduced motion); diagonal section cuts; services as class timetable cards with "Book class"; values as plan cards with middle highlighted; coaches grid with hover reveal; big results quotes; light mode with black bands, full-black dark mode.
- [ ] **Step 3: Register** snippets 1, 2, 4, 5, 7: name "Pulse", category "Fitness", description "Gyms, personal trainers, yoga and dance studios."; presets `classes` (Classes: hero, services, gallery, contact_card), `membership` (Membership: hero, values, faq, contact_card), `coaches` (Coaches: hero, team, testimonials, contact_card); sample `fitnessSite()`.
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/template9`.
- [ ] **Step 5: Commit** "Add t9 Pulse fitness template".

### Task 4: Build t10 Campus (education)

**Files:** Create `src/templates/template10/**`; modify registration files 1–8.

- [ ] **Step 1:** Add t10 to `templateTheme.ts` (`#2747d6 / #121a3a / #141b33 / #5d6582 / #fffdf7 / #f4f1e6`), `TEMPLATE_CATEGORY` (`t10: "education"`), categoryForTemplate assertion. `npm test` — expected FAIL on t10. (Note the CSS file path is `template10/template10.css` — the theme test derives it from `t.slice(1)`.)
- [ ] **Step 2: Build `src/templates/template10/`** per the spec's "t10 Campus" brief: Lexend; warm off-white, royal blue + sunflower highlight (a fixed highlight colour in CSS derived from accent-adjacent tint, not a seventh var); hero headline with highlighted word and SVG underline scribble, "Apply now"/"Book a visit", 3-photo collage, labelled highlights row from values (no invented numbers); programme cards with level chip; use_cases as pathways; teachers from team; "Admissions questions" FAQ; navy dark mode with sunflower accent text.
- [ ] **Step 3: Register** snippets 1, 2, 4, 5, 7: name "Campus", category "Education", description "Schools, tutors, academies and training centres."; presets `programmes` (Programmes: hero, services, use_cases, contact_card), `admissions` (Admissions: hero, richtext, faq, contact_card), `campus-life` (Student life: hero, gallery, testimonials, contact_card); sample `educationSite()`.
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/template10`.
- [ ] **Step 5: Commit** "Add t10 Campus education template".

### Task 5: Build t11 Soirée (events)

**Files:** Create `src/templates/template11/**`; modify registration files 1–8.

- [ ] **Step 1:** Add t11 to `templateTheme.ts` (`#7b2ff7 / #1b0f2e / #1a1225 / #6c6177 / #fdf8ff / #f3ebfb`), `TEMPLATE_CATEGORY` (`t11: "events"`), categoryForTemplate assertion. `npm test` — expected FAIL on t11.
- [ ] **Step 2: Build `src/templates/template11/`** per the spec's "t11 Soirée" brief: Unbounded display + DM Sans; violet/peach gradient-mesh blobs (CSS only), CSS confetti dots; centred huge headline with tilted photo "ticket" card, "Plan your event" CTA; services as ticket-stub packages with perforated edge; values as numbered "How it works" steps; gallery as horizontal scroll strip (scroll-snap, keyboard scrollable); sticky-note testimonials; deep plum dark mode with neon violet glow.
- [ ] **Step 3: Register** snippets 1, 2, 4, 5, 7: name "Soirée", category "Events", description "Event planners, venues, caterers and celebrations."; presets `packages` (Packages: hero, services, faq, contact_card), `venues` (Venues: hero, use_cases, gallery, contact_card), `gallery` (Past events: hero, gallery, testimonials, contact_card); sample `eventsSite()`.
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/template11`.
- [ ] **Step 5: Commit** "Add t11 Soirée events template".

### Task 6: Build t12 Forge (trades / construction)

**Files:** Create `src/templates/template12/**`; modify registration files 1–8.

- [ ] **Step 1:** Add t12 to `templateTheme.ts` (`#f26b1d / #1d2124 / #1b1e21 / #646b71 / #f6f5f2 / #ffffff`), `TEMPLATE_CATEGORY` (`t12: "construction"`), categoryForTemplate assertion. `npm test` — expected FAIL on t12.
- [ ] **Step 2: Build `src/templates/template12/`** per the spec's "t12 Forge" brief: Archivo + Archivo Narrow; concrete greys, safety orange, hazard-stripe accents, square corners; photo hero with dark overlay and quote-request mini-form (name, phone, service select → navigates to `${baseUrl}/contact?service=<title>&name=<name>&phone=<phone>`; the contact form prefills from these params); certification badges from backed_by + "Licensed & insured" chip; icon service tiles; use_cases as projects with covers from gallery photos; numbered process from values; star-row testimonials; FAQ; charcoal dark mode.
- [ ] **Step 3: Register** snippets 1, 2, 4, 5, 7: name "Forge", category "Trades & construction", description "Builders, renovators, electricians, plumbers and home services."; presets `services` (Services: hero, services, values, contact_card), `projects` (Projects: hero, use_cases, gallery, contact_card), `quote` (Get a quote: hero, richtext, faq, contact_card); sample `tradesSite()`.
- [ ] **Step 4: Verify** `npm test`, `npx tsc --noEmit`, `npx eslint src/templates/template12`.
- [ ] **Step 5: Commit** "Add t12 Forge trades template".

### Task 7: Browser verification (controller)

- [ ] For each of t7–t12: `/dev/templates/tN`, `/about`, `/contact`, and one `/p/<preset>` at 1280×800 and 375×812, light and dark; no console errors; no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`); screenshot proof. Fix issues via the review loop.
