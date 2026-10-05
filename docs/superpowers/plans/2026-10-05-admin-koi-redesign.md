# Admin "Koi" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Sulvatech admin (`/admin`), the owner dashboard (`/dashboard`) and `/login` after the "Koi Fish Hero" reference: vivid blue water backdrop, floating glass pill nav, sans + italic-serif headlines, black pill CTAs with a white arrow disc, glass ghost buttons, koi-orange accent.

**Architecture:** Add a small design system in `src/components/ui/` (tokens in `globals.css`, primitives as React components). Swap the two layouts to a shared `AppShell` (water band + glass nav), then migrate pages screen by screen from raw `bg-white ring-1 ring-gray-200` markup to the primitives. Public template sites are untouched.

**Tech Stack:** Next.js 16 app router, React 19, Tailwind v4 (`@import "tailwindcss"` + `@theme`), `next/font/google` (no new npm deps).

**Spec / reference:** recent.design item 7eq5d9w "Koi Fish Hero" (poster `https://cdn.recent.design/items/7eq5d9w/0/poster/1200.webp`). Read off the poster:
- Full-bleed saturated blue water (#0a4fe0 → #1b8cff → #7fd0ff), concentric ripple rings, one orange koi (#ff5a2c) drifting.
- Centered floating glass pill nav: logo mark left, text links, white pill "Contact" on the right.
- Small glass status pill above headline with a dot ("1 project slot for June").
- Headline: line 1 heavy grotesk, line 2 italic serif ("worth obsessing over"). White text.
- Primary CTA: black pill, white label, white circle with arrow on the right. Secondary: translucent glass pill.

## Global Constraints

- No new npm dependencies. Fonts via `next/font/google`: `Inter_Tight` (UI/headings) and `Instrument_Serif` (italic accent words).
- Admin/dashboard only. Do not touch `src/templates/**`, `src/app/d/**`, `src/app/[slug]/**`.
- Water/koi animation must stop under `prefers-reduced-motion: reduce`.
- Text on glass/water: min contrast 4.5:1 (white on ≥ #1b6fe0, or ink on white cards). Never put body copy directly on the light end of the gradient.
- Content (tables, forms, editors) stays on white cards — glass is for chrome only (nav, hero, pills).
- Keep every existing route, prop and data call. This is a visual refactor; behaviour must not change.
- Source files are CRLF: edit with the Edit tool, not sed/perl.
- `npm run typecheck`, `npm run lint`, `npm test` must pass after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/app/globals.css` (modify) | `@theme` tokens, `.koi-water`, `.koi-glass`, ripple + koi keyframes, reduced-motion guard |
| `src/app/layout.tsx` (modify) | load fonts, expose `--font-sans` / `--font-serif` vars |
| `src/components/ui/WaterBackdrop.tsx` | blue gradient + SVG ripple rings + koi SVG |
| `src/components/ui/GlassNav.tsx` | centered floating pill nav (links, active state, right slot) |
| `src/components/ui/Button.tsx` | `PillButton` variants: `primary` (black + arrow disc), `glass`, `white`, `quiet`; `loading` prop |
| `src/components/ui/StatusPill.tsx` | glass pill with dot (`tone: live | draft | warn`) |
| `src/components/ui/PageHero.tsx` | status pill + two-line headline (`title`, `accent` italic) + subtitle + actions |
| `src/components/ui/Card.tsx` | white rounded-3xl card + `CardHeader` |
| `src/components/ui/Field.tsx` | `TextField`, `SelectField`, `TextArea` with label/hint/error |
| `src/components/ui/Tabs.tsx` | segmented pill tabs (role=tablist), link or button mode |
| `src/components/ui/AppShell.tsx` | water band (fixed height) + `GlassNav` + overlapping content container |
| `tests/uiTokens.test.mjs` | asserts tokens exist in globals.css and reduced-motion guard present |

---

### Task 1: Tokens, fonts, motion

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: `tests/uiTokens.test.mjs`

**Interfaces:**
- Produces: CSS vars `--koi-ink #0a0f1f`, `--koi-deep #0a4fe0`, `--koi-sea #1b8cff`, `--koi-foam #7fd0ff`, `--koi-orange #ff5a2c`, `--koi-paper #f4f7fc`, `--koi-line rgba(10,15,31,.08)`; Tailwind colours `koi-ink`, `koi-deep`, `koi-sea`, `koi-foam`, `koi-orange`, `koi-paper`; fonts `font-sans`, `font-serif`; classes `.koi-water`, `.koi-glass`, `.koi-ripple`, `.koi-fish`.

- [ ] **Step 1: Write failing test**

```js
// tests/uiTokens.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("koi tokens are defined", () => {
  for (const v of ["--color-koi-ink", "--color-koi-deep", "--color-koi-sea", "--color-koi-foam", "--color-koi-orange", "--color-koi-paper"]) {
    assert.ok(css.includes(v), `${v} missing`);
  }
});

test("water + koi animation is disabled for reduced motion", () => {
  const i = css.indexOf("prefers-reduced-motion: reduce");
  assert.ok(i > -1);
  const block = css.slice(i, i + 400);
  assert.ok(block.includes(".koi-ripple") && block.includes(".koi-fish"));
});
```

- [ ] **Step 2:** `npm test` → FAIL (tokens missing).
- [ ] **Step 3: Implement** — append to `globals.css` (keep existing rules; change `body` bg to `var(--color-koi-paper)` only inside `.koi-app`, not globally, so public sites are unaffected):

```css
@theme {
  --color-koi-ink: #0a0f1f;
  --color-koi-deep: #0a4fe0;
  --color-koi-sea: #1b8cff;
  --color-koi-foam: #7fd0ff;
  --color-koi-orange: #ff5a2c;
  --color-koi-paper: #f4f7fc;
  --font-sans: var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-instrument-serif), ui-serif, Georgia, serif;
}

.koi-app { background: var(--color-koi-paper); color: var(--color-koi-ink); font-family: var(--font-sans); }

.koi-water {
  background:
    radial-gradient(60% 80% at 75% 35%, rgba(127,208,255,.55), transparent 60%),
    radial-gradient(80% 90% at 20% 110%, rgba(127,208,255,.6), transparent 55%),
    linear-gradient(160deg, #0a3fc4 0%, var(--color-koi-deep) 35%, var(--color-koi-sea) 75%, #4fb6ff 100%);
}

.koi-glass {
  background: rgba(255,255,255,.14);
  border: 1px solid rgba(255,255,255,.28);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}

@keyframes koi-ripple { from { transform: scale(.6); opacity: .55; } to { transform: scale(1.6); opacity: 0; } }
.koi-ripple { transform-origin: center; animation: koi-ripple 6s ease-out infinite; }

@keyframes koi-swim {
  0% { transform: translate(-10%, 30%) rotate(-8deg); }
  50% { transform: translate(55%, 10%) rotate(6deg); }
  100% { transform: translate(110%, 35%) rotate(-4deg); }
}
.koi-fish { animation: koi-swim 28s linear infinite; filter: blur(1.5px); }

@media (prefers-reduced-motion: reduce) {
  .koi-ripple, .koi-fish { animation: none !important; }
}
```

In `src/app/layout.tsx`:

```tsx
import { Inter_Tight, Instrument_Serif } from "next/font/google";
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-instrument-serif", display: "swap" });
// <html className={`${sans.variable} ${serif.variable}`}>
```

- [ ] **Step 4:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `Add koi admin design tokens, fonts and water/ripple motion`

---

### Task 2: UI primitives

**Files:** Create every `src/components/ui/*.tsx` listed above except `AppShell`.

**Interfaces (Produces):**
```ts
// Button.tsx
type PillButtonProps = (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined } | { href: string }) & {
  variant?: "primary" | "glass" | "white" | "quiet"; // default primary
  arrow?: boolean;   // white disc with → on the right; default true for primary
  loading?: boolean; // disables + shows spinner, blocks double submit
  size?: "sm" | "md";
};
export function PillButton(p: PillButtonProps): JSX.Element; // renders next/link when href
// StatusPill.tsx
export function StatusPill(p: { tone?: "live" | "draft" | "warn" | "neutral"; onDark?: boolean; children: React.ReactNode }): JSX.Element;
// PageHero.tsx
export function PageHero(p: { status?: React.ReactNode; title: string; accent?: string; subtitle?: string; actions?: React.ReactNode }): JSX.Element;
// Card.tsx
export function Card(p: { className?: string; children: React.ReactNode; as?: "section" | "div" }): JSX.Element;
export function CardHeader(p: { title: string; description?: string; action?: React.ReactNode }): JSX.Element;
// Field.tsx
export function TextField(p: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode; error?: string }): JSX.Element;
export function SelectField(p: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: React.ReactNode }): JSX.Element;
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: React.ReactNode }): JSX.Element;
// Tabs.tsx
export function Tabs(p: { items: Array<{ id: string; label: string; href?: string; count?: number }>; active: string; onChange?: (id: string) => void; label: string }): JSX.Element;
// GlassNav.tsx
export function GlassNav(p: { brand: React.ReactNode; links: Array<{ href: string; label: string }>; right?: React.ReactNode }): JSX.Element; // active via usePathname().startsWith(href)
// WaterBackdrop.tsx
export function WaterBackdrop(p: { className?: string; koi?: boolean }): JSX.Element; // decorative, aria-hidden
```

Visual spec (Tailwind):
- `primary`: `inline-flex items-center gap-3 rounded-full bg-koi-ink pl-5 pr-1.5 py-1.5 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange`; arrow disc `grid h-7 w-7 place-items-center rounded-full bg-white text-koi-ink` with `→` SVG; disc nudges `translate-x-0.5` on hover.
- `glass`: `koi-glass rounded-full px-5 py-2 text-sm text-white hover:bg-white/25`.
- `white`: `rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-koi-ink shadow-sm`.
- `quiet`: `rounded-full px-4 py-2 text-sm text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5` (for use on white cards).
- `PageHero` title: `font-sans text-4xl sm:text-6xl font-semibold tracking-[-0.03em] text-white`; accent on its own line: `font-serif italic font-normal`.
- `StatusPill`: `koi-glass` when `onDark`, else `bg-koi-ink/5`; dot `h-1.5 w-1.5 rounded-full` green `#3ee08f` live, amber draft, `koi-orange` warn; `text-[11px] uppercase tracking-wider`.
- `Card`: `rounded-3xl bg-white p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5`.
- Inputs: `rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15`.
- `Tabs`: container `inline-flex rounded-full bg-koi-ink/5 p-1`; active `bg-white text-koi-ink shadow-sm`; arrow-key navigation between tabs in button mode.
- `GlassNav`: `koi-glass fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full p-1.5`; links `rounded-full px-3 py-1.5 text-sm text-white/85 hover:text-white`, active `bg-white/20 text-white`; on <640px links collapse into a "Menu" glass button with a dropdown sheet.
- `WaterBackdrop`: absolute inset-0 `koi-water overflow-hidden`; SVG with 4 concentric `<circle class="koi-ripple" stroke="rgba(255,255,255,.35)" fill="none">` staggered `animation-delay` 0/1.5/3/4.5s centred at 72%/38%; koi = simple orange ellipse + tail path, `.koi-fish`, `opacity-80`.

- [ ] **Step 1:** Build the components above.
- [ ] **Step 2:** Add a dev-only gallery page `src/app/dev/ui/page.tsx` rendering every primitive on a `WaterBackdrop` and on `koi-paper` (pattern: other `src/app/dev/**` pages are dev only — copy their `notFound()` guard for production).
- [ ] **Step 3:** `npm run typecheck && npm run lint`; open `/dev/ui` in the preview, screenshot light + 375px width; check focus rings with Tab.
- [ ] **Step 4: Commit** `Add koi UI primitives and dev gallery`

---

### Task 3: AppShell + layouts + login

**Files:**
- Create: `src/components/ui/AppShell.tsx`
- Modify: `src/app/admin/layout.tsx`, `src/app/dashboard/layout.tsx`, `src/app/login/page.tsx`, `src/app/no-access/page.tsx`, `src/app/change-password/page.tsx`

**Interfaces:**
- Consumes: Task 2 primitives.
- Produces: `export function AppShell(p: { brand: string; links: Array<{href:string;label:string}>; right?: React.ReactNode; hero?: React.ReactNode; children: React.ReactNode }): JSX.Element`
  - Layout: `<div class="koi-app min-h-screen">` → header band `relative h-[340px] sm:h-[420px]` with `WaterBackdrop koi` + `GlassNav` + `hero` slot positioned bottom-left in `max-w-6xl` container → `<main class="relative -mt-24 mx-auto max-w-6xl px-4 sm:px-6 pb-16">` so cards overlap the water.
  - Pages pass their hero through a context: `AppShell` exposes `useShellHero(node)` (React context + effect) so each page sets its own `PageHero` without layouts knowing page data.

- [ ] **Step 1:** Implement `AppShell` + `ShellHeroContext` (`setHero`, cleared on unmount).
- [ ] **Step 2:** Admin layout: `brand="Sulva Sites"`, links Sites `/admin/sites`, Users `/admin/users`; `right` = white pill "New site" → `/admin/sites/new` + `LogoutButton` restyled as glass icon button. Keep `RequireAdmin` wrapper.
- [ ] **Step 3:** Dashboard layout: `brand="Sulva · Dashboard"`, links from member sites (keep `DashboardUser` in `right`). Keep `RequireMember`.
- [ ] **Step 4:** Login: full-screen `WaterBackdrop koi`; centred glass card (`koi-glass rounded-[2rem] p-8 max-w-sm`) with `PageHero`-style title "Welcome back" / accent "to Sulva Sites"; inputs white; `PillButton loading`. Same treatment for `no-access` and `change-password`. Do not change auth logic or redirects (`src/lib/loginRouting.ts`).
- [ ] **Step 5:** Verify: preview `/login` (desktop + 375px + reduced-motion emulation via `javascript_tool` `matchMedia` check), log in, `/admin/sites` renders inside shell. `npm run typecheck && npm run lint && npm test`.
- [ ] **Step 6: Commit** `Koi app shell for admin, dashboard and login`

---

### Task 4: Admin sites list + users

**Files:** Modify `src/app/admin/page.tsx`, `src/app/admin/sites/page.tsx`, `src/app/admin/users/page.tsx` (+ any table component it renders).

- [ ] **Step 1:** Sites list hero: status `"{live} live · {draft} drafts"` (computed from the already-loaded list), title "Your sites", accent "worth obsessing over", actions `PillButton href="/admin/sites/new"` "New site" + glass "Users".
- [ ] **Step 2:** Replace the list with a responsive card grid (`grid sm:grid-cols-2 lg:grid-cols-3 gap-4`): each `Card` shows business name, slug URL (mono, truncated), template label chip, `StatusPill` (published/draft), updated date, and a quiet "Open" button. Add client-side search input + status `Tabs` (All / Live / Drafts) filtering the in-memory list (no new queries).
- [ ] **Step 3:** Users page: hero "Team & owners" / accent "who runs what"; table inside `Card` with `rounded-2xl` rows, role chips; forms use `TextField`/`SelectField`/`PillButton loading`.
- [ ] **Step 4:** Verify in preview; empty state = `Card` with koi line icon + "Create your first site" primary button.
- [ ] **Step 5: Commit** `Koi redesign: sites list and users`

---

### Task 5: Site detail + sub-pages (admin) and owner SiteShell

**Files:** Modify `src/app/admin/sites/[siteId]/page.tsx` and the sub-route pages under `[siteId]/` (`pages`, `extra-pages`, `business`, `inbox`, `insights`, `shop/**`, `preview` chrome only), `src/components/admin/site/*.tsx`, `src/components/dashboard/SiteShell.tsx`, `src/components/insights/*`, `src/components/inbox/*`, `src/components/shop-admin/*` (class swaps only).

- [ ] **Step 1:** Site detail hero: status pill (published/draft + domain), title = business name, accent = template label in italic serif, actions: primary "Open editor", glass "Preview", glass "Visit site" (when published).
- [ ] **Step 2:** Replace the long single-column page with `Tabs` in link mode (Overview, Pages, Business, Inbox, Insights, Shop, Settings) using the existing routes; Overview = 2-col grid of `Card`s (Logo, Domains, Extra pages, Team).
- [ ] **Step 3:** `SiteShell` (owner dashboard) uses the same `Tabs` + `PageHero`; keep `tabsForRole` as the single source of which tabs show.
- [ ] **Step 4:** Mechanical class swap across sub-pages: `rounded-lg bg-white ring-1 ring-gray-200` → `Card`; `rounded bg-black px-4 py-2 … text-white` buttons → `PillButton`; inputs → `TextField`/`SelectField`. Preview iframe chrome gets a glass toolbar; the template iframe itself is untouched.
- [ ] **Step 5:** Insights chart: series colour `--color-koi-sea`, highlight `--color-koi-orange` (follow the `dataviz` skill palette rules; keep axis rounding from commit e912dc2).
- [ ] **Step 6:** Verify every tab in preview at desktop + 375px, `npm run typecheck && npm run lint && npm test`.
- [ ] **Step 7: Commit** `Koi redesign: site detail, sub-pages and owner dashboard`

---

### Task 6: New-site page shell (chat lives in the companion plan)

**Files:** Modify `src/app/admin/sites/new/page.tsx`.

- [ ] **Step 1:** Hero: status "AI assistant", title "Tell us about the business", accent "we'll build the rest". Mode switch = `Tabs` (Assistant / Manual).
- [ ] **Step 2:** Manual form → `Card` + fields + `PillButton loading`.
- [ ] **Step 3:** Chat container = `Card` with `p-0`; message bubbles: user `bg-koi-ink text-white rounded-3xl rounded-br-md`, assistant `bg-koi-paper rounded-3xl rounded-bl-md`; quick replies = `quiet` pills; composer = rounded-full input + round primary send. (Behaviour changes are in `2026-10-05-assistant-brand-photos.md`.)
- [ ] **Step 4: Commit** `Koi redesign: new-site page`

---

## Verification (whole plan)

1. `npm run typecheck && npm run lint && npm test` clean.
2. Preview `/login`, `/admin/sites`, `/admin/sites/new`, one site's every tab, `/dashboard` as an owner: screenshots at 1280px and 375px, no horizontal scroll.
3. Reduced motion: ripple + koi static.
4. Keyboard: tab through nav, tabs (arrow keys), buttons; visible focus everywhere.
5. Public site (`/d/<host>`, `/dev/templates/t1`) visually unchanged.
