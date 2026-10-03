# Six new category templates (t7–t12)

Date: 2026-10-03 · Status: approved (user gave blanket approval; looks chosen by Claude)

## Goal

Add templates for business categories that currently have none, each visually distinct
from t1–t6 and from each other, built to the same conventions as the Oct 2026 revamp
(t4–t6): per-page heroes, light + dark mode toggle, theme palette vars, stock photos.

## Shared conventions (bind every template)

- Directory `src/templates/templateN/` mirroring t6: `TemplateN.tsx`, `ctx.tsx`, `icons.tsx`,
  `templateN.css`, `components/TNHeader.tsx`, `components/TNFooter.tsx`,
  `sections/TNSections.tsx` + one file per section type
  (hero, services, richtext, values, contact_card, backed_by, use_cases, gallery,
  testimonials, faq, team). Every section type in `pageSchema.ts` must render.
- `TemplateProps` contract from `src/templates/registry.ts` unchanged; section data contract unchanged.
- Root element class `.templateN`; all CSS scoped under it. Six palette vars
  `--tN-{accent,accent2,ink,muted,bg,surface}` with defaults that exactly match
  `TEMPLATE_THEME_CONFIGS.tN` (test enforces). Lines/tints derived with `color-mix`.
- Fonts via `<TemplateFonts href=…>` (Google Fonts link), never CSS `@import`.
- `pageKind` in ctx (`home | about | contact | extra`) with a distinct hero per kind.
- Light + dark: `useColorMode` + `ModeToggle` from `src/templates/shared/colorMode.tsx`;
  dark overrides under `.templateN[data-mode="dark"]` with `!important` (beats saved inline palettes).
- Inline editing works like t6 (`useInlineEditor`, `src/templates/shared/edit.ts` helpers).
- Photos: hero/feature imagery comes from gallery photos collected across pages (t6 `galleryPhotos` pattern), with graceful no-photo fallbacks.
- Nav renders `navPages`; footer credit "Developed by Sulvatech" → https://sulvatech.com via `src/templates/shared/links.ts`.
- Responsive to 360px; no horizontal scroll; accessible contrast in both modes; `prefers-reduced-motion` respected.
- Self-contained: no imports from other templates' directories (shared/ only).

## Registration (per template)

1. `src/templates/registry.ts` — add to `TEMPLATES`.
2. `src/templates/meta.ts` — name, category, description.
3. `src/lib/templateTheme.ts` — `config("tN", defaults, labels)`.
4. `src/templates/pagePresets.ts` — 2–3 category-specific extra pages.
5. `src/templates/sampleSite.ts` — a category sample site using `photoUrl()` stock photos so `/dev/templates/tN` renders fully.
6. `src/lib/stockPhotos.ts` `TEMPLATE_CATEGORY` — default photo category.
7. `src/app/api/og/site/route.tsx` and `src/app/api/icon/site/route.tsx` — gradient case.
8. Tests: extend the template key lists in `tests/templateTheme.test.mjs`, `tests/pagePresets.test.mjs`, and the template→category test in `tests/stockPhotos.test.mjs`.

## The six templates

| Key | Name | Category | Reference (inspiration only) | Fonts | Default palette (accent / accent2 / ink / muted / bg / surface) |
|---|---|---|---|---|---|
| t7 | Tavola | Restaurant / food | dishoom.com, atomixnyc.com | Young Serif + Figtree | #b5452b / #2a1712 / #231815 / #75655c / #fbf6ee / #f2e8d9 |
| t8 | Vital | Clinic / health | onemedical.com, hellotend.com | Plus Jakarta Sans | #0f8a7e / #0d2b33 / #10262c / #5d7178 / #ffffff / #eef6f4 |
| t9 | Pulse | Fitness | barrys.com, thirdspace.london | Anton (display) + Inter | #e5322d / #0b0b0c / #111112 / #6a6a70 / #ffffff / #f2f2f3 |
| t10 | Campus | Education | minerva.edu, brilliant.org | Lexend | #2747d6 / #121a3a / #141b33 / #5d6582 / #fffdf7 / #f4f1e6 |
| t11 | Soirée | Events | partiful.com, config.figma.com | Unbounded (display) + DM Sans | #7b2ff7 / #1b0f2e / #1a1225 / #6c6177 / #fdf8ff / #f3ebfb |
| t12 | Forge | Trades / construction | blockrenovation.com | Archivo + Archivo Narrow | #f26b1d / #1d2124 / #1b1e21 / #646b71 / #f6f5f2 / #ffffff |

Default photo categories: t7 food, t8 clinic, t9 fitness, t10 education, t11 events, t12 construction.

### t7 Tavola — restaurant
Warm, appetising, editorial. Cream paper, oxblood accent, serif display.
- Home hero: full-bleed food photo with business name set large in serif, an info strip
  (address · hours from richtext/profile · phone) and "Reserve a table" + "View menu" CTAs.
- Services render as a **menu**: two columns, item name … dotted leader … (desc as description),
  grouped under a serif section title; values as "Our kitchen" principles with small icons.
- Gallery: staggered masonry with captions; testimonials as pull quotes from guests.
- About hero: split photo/story; Contact hero: map link + hours card + reservation form.
- Dark mode: "candlelit" — near-black brown bg, cream ink, ember accent.
- Presets: `menu` (Menu: hero, services, gallery, contact_card), `reservations` (Reservations: hero, richtext, faq, contact_card), `events` (Private dining: hero, richtext, gallery, contact_card).

### t8 Vital — clinic / health
Calm, clinical trust; generous whitespace, rounded 20px cards, soft mint surfaces.
- Home hero: headline + subtext left, **appointment card** right ("Book an appointment": service select populated from services titles; submitting navigates to the contact page with `?service=<title>` and the contact form prefills from it, as t5 does), trust row (backed_by as accreditations).
- Services: icon cards with "Learn more"; values as "Why patients choose us" checklist; team as doctor cards (photo, role, bio); FAQ accordion prominent.
- Contact hero: emergency/phone banner + opening hours + form.
- Dark mode: deep teal-navy bg, mint accent.
- Presets: `services` (Treatments), `doctors` (Our doctors: hero, team, testimonials, contact_card), `book` (Book a visit: hero, richtext, faq, contact_card).

### t9 Pulse — fitness
High-energy, high-contrast, bold condensed display type, diagonal cuts, marquee.
- Home hero: dark full-bleed photo, giant condensed uppercase headline, "Start free trial" CTA, scrolling marquee of service titles (reduced-motion: static).
- Services as **class timetable** cards (title, desc, "Book class"); values as membership/pricing-style plan cards (title, desc; middle card highlighted); team as coaches grid with hover reveal; testimonials as big-number "results" quotes.
- Default mode is light with black bands; dark mode is full black with red accent.
- Presets: `classes` (Classes: hero, services, gallery, contact_card), `membership` (Membership: hero, values, faq, contact_card), `coaches` (Coaches: hero, team, testimonials, contact_card).

### t10 Campus — education
Friendly, legible, optimistic. Warm off-white, royal blue + sunflower highlights (yellow derived via accent-adjacent tint, not a seventh var), rounded shapes, underline scribbles in SVG.
- Home hero: headline with highlighted word, CTA "Apply now"/"Book a visit", photo collage of 3 gallery images, stats row (from values count / testimonials count — no invented numbers; use labelled items from values).
- Services as **programmes** cards (level chip from index, title, desc); use_cases as "Pathways"; team as teachers; FAQ "Admissions questions".
- Dark mode: navy bg, sunflower accent text.
- Presets: `programmes` (Programmes: hero, services, use_cases, contact_card), `admissions` (Admissions: hero, richtext, faq, contact_card), `campus-life` (Student life: hero, gallery, testimonials, contact_card).

### t11 Soirée — events
Festive and modern: soft violet/peach gradient blobs, big rounded display type, confetti dots (CSS only).
- Home hero: centered huge headline over gradient mesh with a photo "ticket" card tilted; CTA "Plan your event".
- Services as **event packages** (ticket-stub cards with perforated edge); values as "How it works" numbered steps; gallery as horizontal scroll strip; testimonials as sticky-note quotes.
- Dark mode: deep plum night with neon violet accent and glow.
- Presets: `packages` (Packages: hero, services, faq, contact_card), `venues` (Venues: hero, use_cases, gallery, contact_card), `gallery` (Past events: hero, gallery, testimonials, contact_card).

### t12 Forge — trades / construction
Sturdy, practical, trustworthy: concrete greys, safety orange, hazard-stripe accents, square corners, condensed labels.
- Home hero: photo with dark overlay, headline, **quote request mini-form** (name, phone, service select → submits to contact page route like other templates' contact flows via query prefill), trust badges (backed_by as licences/certifications), "Licensed & insured" chip.
- Services with icon tiles; use_cases as **projects** (cover from gallery photos, location/desc); values as numbered process steps; testimonials with star rows; FAQ.
- Dark mode: charcoal with orange accent.
- Presets: `services` (Services: hero, services, values, contact_card), `projects` (Projects: hero, use_cases, gallery, contact_card), `quote` (Get a quote: hero, richtext, faq, contact_card).

## Out of scope
Changes to t1–t6; new section types; template recommendation in the AI generator.

## Testing / verification
- `npm test` (theme defaults ↔ CSS for t7–t12, presets valid, category mapping), `npx tsc --noEmit`, eslint on touched files.
- Browser: `/dev/templates/tN` home + about + contact + one preset page, desktop 1280 and mobile 375, light and dark; no console errors; screenshots.
