# On-screen Product Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spotlight tour that teaches newcomers to navigate `/admin` (incl. AI tools) and `/dashboard`, auto-starting once and replayable from a header button.

**Architecture:** Pure, unit-tested logic in `src/lib/tour/` (types, step visibility/navigation, tooltip placement, storage, the two tour definitions). React layer in `src/components/tour/` (`TourProvider` state machine + `TourOverlay` spotlight + `TourButton`). Real UI elements are tagged with `data-tour="<id>"`; pages push context (site id, visible tabs, first site) into the provider via `<TourContextSync>`.

**Tech Stack:** Next.js 16 app router, React 19, Tailwind v4 (Koi tokens `koi-ink`, `koi-sea`, `koi-orange`, `koi-paper`), Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-05-onscreen-tour-design.md`

## Global Constraints

- No new dependencies.
- Completion flag: `localStorage` key `sulva.tour.<tourId>.done` = `"1"`; every access wrapped in try/catch.
- Tour ids: `admin`, `owner`.
- Skip available on welcome card ("Skip"), every step ("Skip tour"), and `Esc`.
- Missing target after 2000 ms → step silently skipped.
- Mobile (< 640px viewport) → tooltip renders as bottom sheet.
- Owner tour never mentions AI.
- Files under `src/lib/tour/` must import each other with relative `.ts` paths (no `@/`) — the Node test runner loads them directly.
- Source files are CRLF: use the Edit tool for edits, not sed/perl.
- Run tests with `npm test` (or a single file: `node --experimental-strip-types --no-warnings --test tests/<file>.test.mjs`). Also `npm run typecheck` and `npm run lint` before each commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Map

| File | Responsibility |
|---|---|
| `src/lib/tour/types.ts` | `TourContext`, `TourStep`, `TourDef` |
| `src/lib/tour/steps.ts` | visibility, next/prev index, position counter, navigation check |
| `src/lib/tour/storage.ts` | done flag read/write |
| `src/lib/tour/placement.ts` | tooltip placement math |
| `src/lib/tour/ownerTour.ts` | owner step definitions |
| `src/lib/tour/adminTour.ts` | admin step definitions (incl. AI chapter) |
| `src/components/tour/TourProvider.tsx` | context, state machine, auto-start, keyboard, nav-away end, `useTour`, `TourContextSync` |
| `src/components/tour/TourOverlay.tsx` | dim layer, spotlight cutout, tooltip dialog, target tracking |
| `src/components/tour/TourButton.tsx` | header "Tour" button |
| `tests/tourSteps.test.mjs`, `tests/tourStorage.test.mjs`, `tests/tourPlacement.test.mjs`, `tests/tourDefs.test.mjs` | unit tests |
| Modified: `Tabs.tsx`, `GlassNav.tsx`, `admin/layout.tsx`, `DashboardShell.tsx`, `SiteShell.tsx`, `dashboard/page.tsx`, `admin/sites/page.tsx`, `admin/sites/new/page.tsx`, `SiteAssistant.tsx`, `admin/sites/[siteId]/page.tsx`, `AdminSiteChrome.tsx` | `data-tour` hooks + mounting |

---

### Task 1: Core tour logic (types, steps, storage)

**Files:**
- Create: `src/lib/tour/types.ts`, `src/lib/tour/steps.ts`, `src/lib/tour/storage.ts`
- Test: `tests/tourSteps.test.mjs`, `tests/tourStorage.test.mjs`

**Interfaces:**
- Produces:
  - `type TourContext = { siteId?: string; firstSiteId?: string; siteCount?: number; tabs?: string[] }`
  - `type TourStep = { id: string; target?: string; route?: (ctx: TourContext) => string | null; routePrefix?: boolean; title: string; body: string; when?: (ctx: TourContext) => boolean }`
  - `type TourDef = { id: string; autoStart: (pathname: string) => boolean; steps: TourStep[] }`
  - `isStepVisible(step, ctx): boolean`
  - `nextVisibleIndex(steps, from, dir: 1 | -1, ctx): number` (-1 when none)
  - `stepPosition(steps, index, ctx): { n: number; total: number }`
  - `needsNavigation(route, current, prefix?): boolean` (`current` = pathname + search)
  - `isTourDone(id, store?): boolean`, `markTourDone(id, store?): void`, `tourStorageKey(id): string`

- [ ] **Step 1: Write failing tests**

`tests/tourSteps.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isStepVisible, nextVisibleIndex, stepPosition, needsNavigation } from "../src/lib/tour/steps.ts";

const steps = [
  { id: "a", title: "A", body: "a" },
  { id: "b", title: "B", body: "b", when: (ctx) => ctx.siteCount > 1 },
  { id: "c", title: "C", body: "c", route: (ctx) => (ctx.siteId ? `/dashboard/${ctx.siteId}` : null) },
  { id: "d", title: "D", body: "d" },
];

test("isStepVisible respects when and null route", () => {
  assert.equal(isStepVisible(steps[0], {}), true);
  assert.equal(isStepVisible(steps[1], { siteCount: 1 }), false);
  assert.equal(isStepVisible(steps[1], { siteCount: 2 }), true);
  assert.equal(isStepVisible(steps[2], {}), false);
  assert.equal(isStepVisible(steps[2], { siteId: "x" }), true);
});

test("nextVisibleIndex skips hidden steps both ways", () => {
  assert.equal(nextVisibleIndex(steps, -1, 1, {}), 0);
  assert.equal(nextVisibleIndex(steps, 0, 1, {}), 3);
  assert.equal(nextVisibleIndex(steps, 3, -1, {}), 0);
  assert.equal(nextVisibleIndex(steps, 3, 1, {}), -1);
  assert.equal(nextVisibleIndex(steps, 0, -1, {}), -1);
  assert.equal(nextVisibleIndex(steps, 0, 1, { siteCount: 2 }), 1);
});

test("stepPosition counts visible steps only", () => {
  assert.deepEqual(stepPosition(steps, 0, {}), { n: 1, total: 2 });
  assert.deepEqual(stepPosition(steps, 3, {}), { n: 2, total: 2 });
  assert.deepEqual(stepPosition(steps, 2, { siteId: "x", siteCount: 3 }), { n: 3, total: 4 });
});

test("needsNavigation exact vs prefix", () => {
  assert.equal(needsNavigation("/admin/sites", "/admin/sites"), false);
  assert.equal(needsNavigation("/admin/sites", "/admin/sites/abc"), true);
  assert.equal(needsNavigation("/admin/sites/1?view=settings", "/admin/sites/1"), true);
  assert.equal(needsNavigation("/admin/sites/1?view=settings", "/admin/sites/1?view=settings"), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/1/inbox", true), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/1?x=1", true), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/12", true), true);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard", true), true);
});
```

`tests/tourStorage.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isTourDone, markTourDone, tourStorageKey } from "../src/lib/tour/storage.ts";

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
}
const throwing = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};

test("key format", () => {
  assert.equal(tourStorageKey("owner"), "sulva.tour.owner.done");
});

test("round trip", () => {
  const s = memoryStore();
  assert.equal(isTourDone("admin", s), false);
  markTourDone("admin", s);
  assert.equal(isTourDone("admin", s), true);
  assert.equal(isTourDone("owner", s), false);
});

test("blocked storage is treated as not done and never throws", () => {
  assert.equal(isTourDone("admin", throwing), false);
  assert.doesNotThrow(() => markTourDone("admin", throwing));
  assert.equal(isTourDone("admin", null), false);
  assert.doesNotThrow(() => markTourDone("admin", null));
});
```

- [ ] **Step 2: Run tests, expect FAIL** (module not found)

Run: `node --experimental-strip-types --no-warnings --test tests/tourSteps.test.mjs tests/tourStorage.test.mjs`

- [ ] **Step 3: Implement**

`src/lib/tour/types.ts`:
```ts
export type TourContext = {
  siteId?: string;
  firstSiteId?: string;
  siteCount?: number;
  /** Dashboard tabs the current user can see on the current site. */
  tabs?: string[];
};

export type TourStep = {
  id: string;
  /** `data-tour` value of the element to spotlight; absent = centered card. */
  target?: string;
  /** Where the step lives; returning null hides the step. */
  route?: (ctx: TourContext) => string | null;
  /** Treat any path under `route` as already there. */
  routePrefix?: boolean;
  title: string;
  body: string;
  when?: (ctx: TourContext) => boolean;
};

export type TourDef = {
  id: string;
  autoStart: (pathname: string) => boolean;
  steps: TourStep[];
};
```

`src/lib/tour/steps.ts`:
```ts
import type { TourContext, TourStep } from "./types.ts";

export function isStepVisible(step: TourStep, ctx: TourContext): boolean {
  if (step.when && !step.when(ctx)) return false;
  if (step.route && step.route(ctx) === null) return false;
  return true;
}

export function nextVisibleIndex(steps: TourStep[], from: number, dir: 1 | -1, ctx: TourContext): number {
  for (let i = from + dir; i >= 0 && i < steps.length; i += dir) {
    if (isStepVisible(steps[i], ctx)) return i;
  }
  return -1;
}

export function stepPosition(steps: TourStep[], index: number, ctx: TourContext): { n: number; total: number } {
  let n = 0;
  let total = 0;
  steps.forEach((step, i) => {
    if (!isStepVisible(step, ctx)) return;
    total += 1;
    if (i <= index) n += 1;
  });
  return { n, total };
}

export function needsNavigation(route: string, current: string, prefix = false): boolean {
  if (current === route) return false;
  if (!prefix) return true;
  return !(current.startsWith(`${route}/`) || current.startsWith(`${route}?`));
}
```

`src/lib/tour/storage.ts`:
```ts
type KV = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function tourStorageKey(id: string): string {
  return `sulva.tour.${id}.done`;
}

function defaultStore(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isTourDone(id: string, store: KV | null = defaultStore()): boolean {
  try {
    return store?.getItem(tourStorageKey(id)) === "1";
  } catch {
    return false;
  }
}

export function markTourDone(id: string, store: KV | null = defaultStore()): void {
  try {
    store?.setItem(tourStorageKey(id), "1");
  } catch {
    // Private mode / blocked storage: tour may show again, still skippable.
  }
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `node --experimental-strip-types --no-warnings --test tests/tourSteps.test.mjs tests/tourStorage.test.mjs`

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/tour/types.ts src/lib/tour/steps.ts src/lib/tour/storage.ts tests/tourSteps.test.mjs tests/tourStorage.test.mjs
git commit -m "tour: core step logic and completion storage"
```

---

### Task 2: Tooltip placement

**Files:**
- Create: `src/lib/tour/placement.ts`
- Test: `tests/tourPlacement.test.mjs`

**Interfaces:**
- Produces:
  - `type Rect = { top: number; left: number; width: number; height: number }`
  - `type Size = { width: number; height: number }`
  - `type Placement = { mode: "center" } | { mode: "sheet" } | { mode: "float"; side: "bottom" | "top" | "right" | "left" | "inside"; top: number; left: number }`
  - `SHEET_BREAKPOINT = 640`, `GAP = 12`, `MARGIN = 8`
  - `placeTooltip(target: Rect | null, tip: Size, viewport: Size): Placement`

- [ ] **Step 1: Write failing test** — `tests/tourPlacement.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeTooltip, SHEET_BREAKPOINT, GAP, MARGIN } from "../src/lib/tour/placement.ts";

const vp = { width: 1280, height: 800 };
const tip = { width: 320, height: 180 };

test("narrow viewport uses bottom sheet", () => {
  assert.deepEqual(placeTooltip({ top: 10, left: 10, width: 50, height: 20 }, tip, { width: SHEET_BREAKPOINT - 1, height: 800 }), { mode: "sheet" });
  assert.deepEqual(placeTooltip(null, tip, { width: 375, height: 800 }), { mode: "sheet" });
});

test("no target centers on desktop", () => {
  assert.deepEqual(placeTooltip(null, tip, vp), { mode: "center" });
});

test("prefers below the target, horizontally centered", () => {
  const p = placeTooltip({ top: 100, left: 500, width: 100, height: 40 }, tip, vp);
  assert.equal(p.side, "bottom");
  assert.equal(p.top, 100 + 40 + GAP);
  assert.equal(p.left, 550 - 160);
});

test("flips above when no room below", () => {
  const p = placeTooltip({ top: 700, left: 500, width: 100, height: 40 }, tip, vp);
  assert.equal(p.side, "top");
  assert.equal(p.top, 700 - GAP - 180);
});

test("clamps inside viewport near edges", () => {
  const p = placeTooltip({ top: 100, left: 0, width: 40, height: 40 }, tip, vp);
  assert.equal(p.left, MARGIN);
  const q = placeTooltip({ top: 100, left: 1260, width: 20, height: 40 }, tip, vp);
  assert.equal(q.left, 1280 - 320 - MARGIN);
});

test("huge target places tooltip inside, pinned to bottom", () => {
  const p = placeTooltip({ top: 0, left: 0, width: 1280, height: 800 }, tip, vp);
  assert.equal(p.side, "inside");
  assert.equal(p.top, 800 - 180 - MARGIN);
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --experimental-strip-types --no-warnings --test tests/tourPlacement.test.mjs`

- [ ] **Step 3: Implement** — `src/lib/tour/placement.ts`:
```ts
export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Placement =
  | { mode: "center" }
  | { mode: "sheet" }
  | { mode: "float"; side: "bottom" | "top" | "right" | "left" | "inside"; top: number; left: number };

export const SHEET_BREAKPOINT = 640;
export const GAP = 12;
export const MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

export function placeTooltip(target: Rect | null, tip: Size, vp: Size): Placement {
  if (vp.width < SHEET_BREAKPOINT) return { mode: "sheet" };
  if (!target) return { mode: "center" };

  const bottom = target.top + target.height;
  const right = target.left + target.width;
  const centeredLeft = clamp(target.left + target.width / 2 - tip.width / 2, MARGIN, vp.width - tip.width - MARGIN);
  const centeredTop = clamp(target.top + target.height / 2 - tip.height / 2, MARGIN, vp.height - tip.height - MARGIN);

  if (bottom + GAP + tip.height <= vp.height - MARGIN) {
    return { mode: "float", side: "bottom", top: bottom + GAP, left: centeredLeft };
  }
  if (target.top - GAP - tip.height >= MARGIN) {
    return { mode: "float", side: "top", top: target.top - GAP - tip.height, left: centeredLeft };
  }
  if (right + GAP + tip.width <= vp.width - MARGIN) {
    return { mode: "float", side: "right", top: centeredTop, left: right + GAP };
  }
  if (target.left - GAP - tip.width >= MARGIN) {
    return { mode: "float", side: "left", top: centeredTop, left: target.left - GAP - tip.width };
  }
  return { mode: "float", side: "inside", top: vp.height - tip.height - MARGIN, left: centeredLeft };
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit**

```bash
git add src/lib/tour/placement.ts tests/tourPlacement.test.mjs
git commit -m "tour: tooltip placement with edge flipping and mobile sheet"
```

---

### Task 3: Tour definitions (owner + admin with AI chapter)

**Files:**
- Create: `src/lib/tour/ownerTour.ts`, `src/lib/tour/adminTour.ts`
- Test: `tests/tourDefs.test.mjs`

**Interfaces:**
- Consumes: `TourDef`, `TourContext` (Task 1), `isStepVisible` (Task 1)
- Produces: `ownerTour: TourDef` (id `"owner"`), `adminTour: TourDef` (id `"admin"`).
- `data-tour` targets used (Task 5 must add every one):
  - owner: `site-cards`, `site-status`, `site-tabs`, `tab-content`, `tab-inbox`, `tab-business`, `tab-shop`, `tab-insights`, `tab-team`, `tour-button`
  - admin: `sites-list`, `nav-users`, `new-site`, `assistant-mode`, `assistant-chat`, `ai-content`, `ai-seo-all`, `site-tabs`, `tour-button`

- [ ] **Step 1: Write failing test** — `tests/tourDefs.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerTour } from "../src/lib/tour/ownerTour.ts";
import { adminTour } from "../src/lib/tour/adminTour.ts";
import { isStepVisible } from "../src/lib/tour/steps.ts";

const visible = (tour, ctx) => tour.steps.filter((s) => isStepVisible(s, ctx)).map((s) => s.id);

test("every step has id, title, body; ids unique", () => {
  for (const tour of [ownerTour, adminTour]) {
    const ids = tour.steps.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, tour.id);
    for (const s of tour.steps) assert.ok(s.title && s.body, `${tour.id}:${s.id}`);
  }
});

test("owner tour mentions no AI", () => {
  for (const s of ownerTour.steps) assert.doesNotMatch(`${s.title} ${s.body}`, /\bAI\b/);
});

test("owner: owner role on shop template", () => {
  const ids = visible(ownerTour, { siteId: "s1", siteCount: 1, tabs: ["overview", "content", "shop", "inbox", "insights", "team"] });
  assert.deepEqual(ids, ["welcome", "status", "tabs", "content", "inbox", "shop", "insights", "team", "replay"]);
});

test("owner: staff sees only their tabs", () => {
  const ids = visible(ownerTour, { siteId: "s1", siteCount: 1, tabs: ["overview", "inbox", "business"] });
  assert.deepEqual(ids, ["welcome", "status", "tabs", "inbox", "business", "replay"]);
});

test("owner: site list with several sites starts with pick-site", () => {
  const ids = visible(ownerTour, { siteCount: 3, firstSiteId: "s1" });
  assert.equal(ids[1], "pick-site");
  assert.ok(ids.includes("status"));
});

test("owner: no site at all keeps only centered steps", () => {
  assert.deepEqual(visible(ownerTour, { siteCount: 0 }), ["welcome", "replay"]);
});

test("owner route stays on current site sub-pages", () => {
  const status = ownerTour.steps.find((s) => s.id === "status");
  assert.equal(status.route({ siteId: "s1", firstSiteId: "s9" }), "/dashboard/s1");
  assert.equal(status.route({ firstSiteId: "s9" }), "/dashboard/s9");
  assert.equal(status.routePrefix, true);
});

test("owner autoStart only on landing pages", () => {
  assert.equal(ownerTour.autoStart("/dashboard"), true);
  assert.equal(ownerTour.autoStart("/dashboard/abc"), true);
  assert.equal(ownerTour.autoStart("/dashboard/abc/inbox"), false);
});

test("admin: full tour with a site includes AI chapter in order", () => {
  const ids = visible(adminTour, { firstSiteId: "s1" });
  assert.deepEqual(ids, [
    "welcome", "sites-list", "users", "new-site",
    "assistant-mode", "assistant-chat", "ai-content", "ai-seo-all", "ai-seo-page",
    "site-tabs", "replay",
  ]);
  const ai = adminTour.steps.find((s) => s.id === "ai-content");
  assert.equal(ai.route({ firstSiteId: "s1" }), "/admin/sites/s1?view=settings");
});

test("admin: no sites drops site-specific steps", () => {
  const ids = visible(adminTour, {});
  assert.ok(!ids.includes("ai-content"));
  assert.ok(!ids.includes("ai-seo-all"));
  assert.ok(!ids.includes("site-tabs"));
  assert.ok(ids.includes("assistant-chat"));
});

test("admin autoStart only on sites list", () => {
  assert.equal(adminTour.autoStart("/admin/sites"), true);
  assert.equal(adminTour.autoStart("/admin/sites/new"), false);
  assert.equal(adminTour.autoStart("/admin/users"), false);
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `node --experimental-strip-types --no-warnings --test tests/tourDefs.test.mjs`

- [ ] **Step 3: Implement**

`src/lib/tour/ownerTour.ts`:
```ts
import type { TourContext, TourDef } from "./types.ts";

function siteBase(ctx: TourContext): string | null {
  const id = ctx.siteId ?? ctx.firstSiteId;
  return id ? `/dashboard/${id}` : null;
}

const hasTab = (tab: string) => (ctx: TourContext) => Boolean(ctx.tabs?.includes(tab));

const onSite = { route: siteBase, routePrefix: true };

export const ownerTour: TourDef = {
  id: "owner",
  autoStart: (pathname) => {
    const parts = pathname.split("/").filter(Boolean);
    return parts[0] === "dashboard" && parts.length <= 2;
  },
  steps: [
    {
      id: "welcome",
      title: "Welcome to your back office",
      body: "This quick tour shows where everything lives. It takes about a minute, and you can replay it anytime.",
    },
    {
      id: "pick-site",
      target: "site-cards",
      route: (ctx) => (ctx.siteId ? null : "/dashboard"),
      when: (ctx) => (ctx.siteCount ?? 0) > 1,
      title: "Your sites",
      body: "Each card is a website you help run. Open one to manage it. For this tour we'll open the first one.",
    },
    {
      id: "status",
      target: "site-status",
      ...onSite,
      title: "Draft or published",
      body: "This shows whether your site is live. Published means visitors can see it. Draft means it is still private.",
    },
    {
      id: "tabs",
      target: "site-tabs",
      ...onSite,
      title: "Your sections",
      body: "Everything for this site is grouped into these tabs. Here's what each one does.",
    },
    {
      id: "content",
      target: "tab-content",
      ...onSite,
      when: hasTab("content"),
      title: "Content",
      body: "Edit the words and pictures on your pages. Save a draft, preview it, then publish when you're happy.",
    },
    {
      id: "inbox",
      target: "tab-inbox",
      ...onSite,
      when: hasTab("inbox"),
      title: "Inbox",
      body: "Enquiries, bookings and messages from your website arrive here. The number shows how many are new.",
    },
    {
      id: "business",
      target: "tab-business",
      ...onSite,
      when: hasTab("business"),
      title: "Business",
      body: "Keep your business details current: menus, timetables, services and more. Changes show on your site.",
    },
    {
      id: "shop",
      target: "tab-shop",
      ...onSite,
      when: hasTab("shop"),
      title: "Shop",
      body: "Add products, set prices and stock, and follow up on orders.",
    },
    {
      id: "insights",
      target: "tab-insights",
      ...onSite,
      when: hasTab("insights"),
      title: "Insights",
      body: "See how many people visit, which pages they read and where they come from.",
    },
    {
      id: "team",
      target: "tab-team",
      ...onSite,
      when: hasTab("team"),
      title: "Team",
      body: "Give your staff their own logins so they can help with the inbox and business details.",
    },
    {
      id: "replay",
      target: "tour-button",
      title: "Replay anytime",
      body: "Click Tour whenever you need a refresher.",
    },
  ],
};
```

Note: the `welcome` and `replay` steps have no `route`, so they stay visible with no site (test "no site at all"). `replay` targets the header button, which exists on every page.

`src/lib/tour/adminTour.ts`:
```ts
import type { TourContext, TourDef } from "./types.ts";

const site = (suffix = "") => (ctx: TourContext) => (ctx.firstSiteId ? `/admin/sites/${ctx.firstSiteId}${suffix}` : null);

export const adminTour: TourDef = {
  id: "admin",
  autoStart: (pathname) => pathname === "/admin/sites",
  steps: [
    {
      id: "welcome",
      title: "Welcome to Sulva Sites",
      body: "A short tour of building and running client sites, including the AI tools that do most of the heavy lifting.",
    },
    {
      id: "sites-list",
      target: "sites-list",
      route: () => "/admin/sites",
      title: "All client sites",
      body: "Every site you've built lives here. Search, filter by Live or Draft, and open one to manage it.",
    },
    {
      id: "users",
      target: "nav-users",
      title: "Users",
      body: "Create owner and staff logins for clients. New accounts must change their temporary password when they first sign in.",
    },
    {
      id: "new-site",
      target: "new-site",
      title: "Start a new site",
      body: "Build a site from scratch, with the AI assistant or by hand.",
    },
    {
      id: "assistant-mode",
      target: "assistant-mode",
      route: () => "/admin/sites/new",
      title: "Assistant or manual",
      body: "Pick Assistant to let AI build the site for you, or Manual setup to choose the template and fill in details yourself.",
    },
    {
      id: "assistant-chat",
      target: "assistant-chat",
      route: () => "/admin/sites/new",
      title: "Describe the business",
      body: "Tell the assistant the business name, what it does and where it is. One message is enough. Then add a logo, colours and photos, and it builds the whole site.",
    },
    {
      id: "ai-content",
      target: "ai-content",
      route: site("?view=settings"),
      title: "AI content generator",
      body: "Rewrites the copy for every page from the business brief. Review it, then publish when it reads right.",
    },
    {
      id: "ai-seo-all",
      target: "ai-seo-all",
      route: site("?view=settings"),
      title: "AI SEO for all pages",
      body: "Writes page titles, descriptions and image alt text across the whole site in one go.",
    },
    {
      id: "ai-seo-page",
      title: "AI on a single page",
      body: "Inside any page editor, the \"AI: improve SEO & alt text\" button does the same for one page. Click Save Draft afterwards to keep the results.",
    },
    {
      id: "site-tabs",
      target: "site-tabs",
      route: site(),
      title: "Site sections",
      body: "Pages, business data, inbox, insights, shop and settings for this site all live in these tabs.",
    },
    {
      id: "replay",
      target: "tour-button",
      title: "Replay anytime",
      body: "Click Tour whenever you need a refresher.",
    },
  ],
};
```

- [ ] **Step 4: Run, expect PASS**

Run: `node --experimental-strip-types --no-warnings --test tests/tourDefs.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add src/lib/tour/ownerTour.ts src/lib/tour/adminTour.ts tests/tourDefs.test.mjs
git commit -m "tour: owner and admin tour definitions incl. AI chapter"
```

---

### Task 4: Tour UI (provider, overlay, button)

**Files:**
- Create: `src/components/tour/TourProvider.tsx`, `src/components/tour/TourOverlay.tsx`, `src/components/tour/TourButton.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces:
  - `<TourProvider tour={TourDef} baseContext?={TourContext}>` — client component
  - `useTour(): { start(): void; active: boolean } | null`
  - `<TourContextSync {...Partial<TourContext>} />` — pushes context while mounted, clears its keys on unmount
  - `<TourButton />` — renders `data-tour="tour-button"`, calls `start()`
  - `<TourOverlay step index steps ctx onNext onBack onSkip onMissing />` (internal to provider)

- [ ] **Step 1: Implement `TourProvider.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { needsNavigation, nextVisibleIndex } from "@/lib/tour/steps";
import { isTourDone, markTourDone } from "@/lib/tour/storage";
import type { TourContext, TourDef } from "@/lib/tour/types";

import { TourOverlay } from "./TourOverlay";

type TourApi = {
  start: () => void;
  active: boolean;
  setContext: (patch: Partial<TourContext>) => void;
};

const TourCtx = createContext<TourApi | null>(null);
// Separate, stable context so syncing components don't re-run on every step change.
const TourSetterCtx = createContext<TourApi["setContext"] | null>(null);

export function useTour(): Pick<TourApi, "start" | "active"> | null {
  return useContext(TourCtx);
}

/** Pushes page-level facts (current site, visible tabs, first site) into the tour while mounted. */
export function TourContextSync(props: Partial<TourContext>) {
  const setContext = useContext(TourSetterCtx);
  const key = JSON.stringify(props);
  useEffect(() => {
    if (!setContext) return;
    const patch = JSON.parse(key) as Partial<TourContext>;
    setContext(patch);
    return () => {
      const cleared: Partial<TourContext> = {};
      for (const k of Object.keys(patch) as Array<keyof TourContext>) cleared[k] = undefined;
      setContext(cleared);
    };
  }, [setContext, key]);
  return null;
}

const AUTO_START_DELAY_MS = 700;

export function TourProvider({
  tour,
  baseContext,
  children,
}: {
  tour: TourDef;
  baseContext?: TourContext;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [extra, setExtra] = useState<TourContext>({});
  const ctx = useMemo<TourContext>(() => ({ ...baseContext, ...extra }), [baseContext, extra]);
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const [index, setIndex] = useState(-1);
  const dirRef = useRef<1 | -1>(1);
  const expectedPathRef = useRef<string | null>(null);
  const lastPathRef = useRef(pathname);
  const autoStartedRef = useRef(false);

  const setContext = useCallback((patch: Partial<TourContext>) => {
    setExtra((prev) => ({ ...prev, ...patch }));
  }, []);

  const end = useCallback(() => {
    setIndex(-1);
    markTourDone(tour.id);
    document.querySelector<HTMLElement>('[data-tour="tour-button"]')?.focus();
  }, [tour.id]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) {
        end();
        return;
      }
      const step = tour.steps[i];
      const route = step.route?.(ctxRef.current) ?? null;
      const current = window.location.pathname + window.location.search;
      if (route && needsNavigation(route, current, step.routePrefix)) {
        expectedPathRef.current = route.split("?")[0];
        router.push(route);
      }
      setIndex(i);
    },
    [end, router, tour.steps],
  );

  const start = useCallback(() => {
    dirRef.current = 1;
    goTo(nextVisibleIndex(tour.steps, -1, 1, ctxRef.current));
  }, [goTo, tour.steps]);

  const next = useCallback(() => {
    dirRef.current = 1;
    goTo(nextVisibleIndex(tour.steps, index, 1, ctxRef.current));
  }, [goTo, index, tour.steps]);

  const back = useCallback(() => {
    const i = nextVisibleIndex(tour.steps, index, -1, ctxRef.current);
    if (i < 0) return;
    dirRef.current = -1;
    goTo(i);
  }, [goTo, index, tour.steps]);

  const skipMissing = useCallback(() => {
    goTo(nextVisibleIndex(tour.steps, index, dirRef.current, ctxRef.current));
  }, [goTo, index, tour.steps]);

  // Auto-start once, after redirects (e.g. single-site owners bounced to their site) settle.
  useEffect(() => {
    if (autoStartedRef.current || index >= 0) return;
    if (!tour.autoStart(pathname) || isTourDone(tour.id)) return;
    const t = window.setTimeout(() => {
      autoStartedRef.current = true;
      start();
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, index, start, tour]);

  // Leaving the page yourself mid-tour ends it.
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    if (expectedPathRef.current === pathname) {
      expectedPathRef.current = null;
      return;
    }
    if (index >= 0) end();
  }, [pathname, index, end]);

  const api = useMemo<TourApi>(() => ({ start, active: index >= 0, setContext }), [start, index, setContext]);

  return (
    <TourSetterCtx.Provider value={setContext}>
    <TourCtx.Provider value={api}>
      {children}
      {index >= 0 ? (
        <TourOverlay
          key={index}
          steps={tour.steps}
          index={index}
          ctx={ctx}
          onNext={next}
          onBack={back}
          onSkip={end}
          onMissing={skipMissing}
        />
      ) : null}
    </TourCtx.Provider>
    </TourSetterCtx.Provider>
  );
}
```

`key={index}` remounts the overlay per step, so its rect/ready state starts fresh without resetting state inside effects.

- [ ] **Step 2: Implement `TourOverlay.tsx`**

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";

import { placeTooltip, type Placement, type Rect } from "@/lib/tour/placement";
import { nextVisibleIndex, stepPosition } from "@/lib/tour/steps";
import type { TourContext, TourStep } from "@/lib/tour/types";

const MISSING_TIMEOUT_MS = 2000;
const PAD = 8;

function sameRect(a: Rect | null, b: Rect): boolean {
  return !!a && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function TourOverlay({
  steps,
  index,
  ctx,
  onNext,
  onBack,
  onSkip,
  onMissing,
}: {
  steps: TourStep[];
  index: number;
  ctx: TourContext;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onMissing: () => void;
}) {
  const step = steps[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(!step.target);
  const [tipSize, setTipSize] = useState({ width: 340, height: 200 });
  // Overlay only mounts after client interaction/effects, never during SSR.
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const dialogRef = useRef<HTMLDivElement>(null);
  const missingRef = useRef(onMissing);
  useEffect(() => {
    missingRef.current = onMissing;
  }, [onMissing]);

  // Track the target every frame: survives route changes, scrolling, resizing and late renders.
  useEffect(() => {
    if (!step.target) return;
    const selector = `[data-tour="${step.target}"]`;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let seen = false;
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect();
      if (el && r && r.width > 0 && r.height > 0) {
        if (!seen) {
          seen = true;
          el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          setReady(true);
        }
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
      } else if (!seen && performance.now() - t0 > MISSING_TIMEOUT_MS) {
        missingRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setTipSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (ready) dialogRef.current?.focus();
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onBack, onSkip]);

  function trapFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>("button");
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const padded = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const placement: Placement = placeTooltip(step.target ? padded : null, tipSize, viewport);
  const { n, total } = stepPosition(steps, index, ctx);
  const isFirst = nextVisibleIndex(steps, index, -1, ctx) < 0;
  const isLast = nextVisibleIndex(steps, index, 1, ctx) < 0;
  const isWelcome = step.id === "welcome";

  let tipStyle: CSSProperties;
  const tipBase = "fixed z-[102] rounded-3xl bg-white p-5 text-koi-ink shadow-2xl ring-1 ring-koi-ink/10 outline-none";
  const tipClass =
    placement.mode === "sheet"
      ? `${tipBase} inset-x-4 bottom-4`
      : `${tipBase} w-[22rem] motion-safe:transition-[top,left] motion-safe:duration-200`;
  if (placement.mode === "sheet") {
    tipStyle = {};
  } else if (placement.mode === "center") {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    tipStyle = { top: placement.top, left: placement.left };
  }

  return (
    <>
      {/* Click shield: the page stays visible but inert while touring. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[100] ${padded ? "" : "bg-koi-ink/60"}`}
      />
      {padded ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[101] rounded-2xl ring-2 ring-koi-orange motion-safe:transition-all motion-safe:duration-200"
          style={{ ...padded, boxShadow: "0 0 0 9999px rgba(10,15,31,.6)" }}
        />
      ) : null}
      {ready ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={tipClass}
          style={tipStyle}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-koi-ink/50">
            {isWelcome ? "Quick tour" : `${n} of ${total}`}
          </p>
          <h2 id="tour-title" className="mt-1 text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-koi-ink/75">
            {step.body}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-koi-ink/60 underline-offset-2 hover:text-koi-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
            >
              {isWelcome ? "Skip" : "Skip tour"}
            </button>
            <div className="flex items-center gap-2">
              {!isFirst ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full px-4 py-1.5 text-sm ring-1 ring-koi-ink/15 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-koi-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
              >
                {isWelcome ? "Show me around" : isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
```

Notes for implementer:
- `onNext` on the last step calls `goTo(-1)`, which ends + marks done.
- Escape on the welcome card = Skip (marks done), per spec.

- [ ] **Step 3: Implement `TourButton.tsx`**

```tsx
"use client";

import { useTour } from "./TourProvider";

export function TourButton() {
  const tour = useTour();
  if (!tour) return null;
  return (
    <button
      type="button"
      data-tour="tour-button"
      onClick={tour.start}
      aria-label="Take the tour"
      className="koi-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px] font-semibold">
        ?
      </span>
      Tour
    </button>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck` and `npm run lint`
Expected: no errors in `src/components/tour/*`. If `react-hooks` lint flags ref writes, they are all inside effects already; fix any reported line rather than disabling the rule.

- [ ] **Step 5: Commit**

```bash
git add src/components/tour
git commit -m "tour: provider, spotlight overlay and tour button"
```

---

### Task 5: Wire tour into shells and tag targets

**Files:**
- Modify: `src/components/ui/Tabs.tsx`, `src/components/ui/GlassNav.tsx`
- Modify: `src/app/admin/layout.tsx`, `src/components/dashboard/DashboardShell.tsx`, `src/components/dashboard/SiteShell.tsx`
- Modify: `src/app/dashboard/page.tsx`, `src/app/admin/sites/page.tsx`, `src/app/admin/sites/new/page.tsx`, `src/components/admin/SiteAssistant.tsx`, `src/app/admin/sites/[siteId]/page.tsx`, `src/components/admin/site/AdminSiteChrome.tsx`

**Interfaces:**
- Consumes: `TourProvider`, `TourContextSync`, `TourButton` (Task 4); `ownerTour`, `adminTour` (Task 3).
- Produces: every `data-tour` target listed in Task 3.

- [ ] **Step 1: `Tabs.tsx` — tour hooks**

Change type: `export type TabItem = { id: string; label: string; href?: string; count?: number; tourId?: string };`
Add prop `tourId?: string` to `Tabs` props (destructure `tourId`, type `tourId?: string`).
Add `data-tour={tourId}` to both the `<nav aria-label={label} ...>` and `<div role="tablist" ...>` wrappers.
Add `data-tour={item.tourId}` to the `<Link ...>` (link mode) and the `<button ...>` (tab mode).

- [ ] **Step 2: `GlassNav.tsx` — nav link hook**

Change `export type NavLink = { href: string; label: string; tourId?: string };` and on the **desktop** `<Link>` inside the first `links.map` (around line 56) add `data-tour={l.tourId}`. Leave the mobile sheet links untagged (hidden sheet → step auto-skips).

- [ ] **Step 3: `src/app/admin/layout.tsx`**

```tsx
import type { ReactNode } from "react";

import LogoutButton from "@/components/LogoutButton";
import RequireAdmin from "@/components/RequireAdmin";
import { TourButton } from "@/components/tour/TourButton";
import { TourProvider } from "@/components/tour/TourProvider";
import { AppShell } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { adminTour } from "@/lib/tour/adminTour";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <TourProvider tour={adminTour}>
        <AppShell
          brand="Sulva Sites"
          brandHref="/admin/sites"
          bareRoutes="^/admin/sites/[^/]+/preview$"
          links={[
            { href: "/admin/sites", label: "Sites" },
            { href: "/admin/users", label: "Users", tourId: "nav-users" },
          ]}
          right={
            <>
              <TourButton />
              <span data-tour="new-site" className="inline-flex">
                <PillButton href="/admin/sites/new" variant="white" size="sm" arrow={false}>
                  New site
                </PillButton>
              </span>
              <LogoutButton variant="glass" />
            </>
          }
        >
          {children}
        </AppShell>
      </TourProvider>
    </RequireAdmin>
  );
}
```

Add `"use client";` as the very first line of `src/app/admin/layout.tsx`. Reason: `adminTour` contains functions, and a server component cannot pass functions as props to a client component. The layout has no server-only code.

- [ ] **Step 4: `DashboardShell.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import DashboardUser from "@/components/dashboard/DashboardUser";
import { useMember } from "@/components/RequireMember";
import { TourButton } from "@/components/tour/TourButton";
import { TourProvider } from "@/components/tour/TourProvider";
import { AppShell } from "@/components/ui/AppShell";
import { ownerTour } from "@/lib/tour/ownerTour";

/** Koi shell for the owner dashboard: one nav link per site the user belongs to. */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const { memberships } = useMember();
  const links = memberships.map((m) => ({ href: `/dashboard/${m.siteId}`, label: m.businessName }));
  const firstSiteId = memberships[0]?.siteId;
  const baseContext = useMemo(
    () => ({ siteCount: memberships.length, firstSiteId }),
    [memberships.length, firstSiteId],
  );
  return (
    <TourProvider tour={ownerTour} baseContext={baseContext}>
      <AppShell
        brand="Sulva · Dashboard"
        brandHref="/dashboard"
        links={links}
        right={
          <div className="flex items-center gap-1">
            <TourButton />
            <DashboardUser />
          </div>
        }
      >
        {children}
      </AppShell>
    </TourProvider>
  );
}
```

- [ ] **Step 5: `SiteShell.tsx`**

Add import `import { TourContextSync } from "@/components/tour/TourProvider";`.
In the final `return`, inside `<SiteContext.Provider value={value}>`, add as first child:
```tsx
<TourContextSync siteId={siteId} tabs={tabs} />
```
Change the `<Tabs ...>` call: add prop `tourId="site-tabs"` and in `items` map add `tourId: \`tab-${tab}\``.
In `SiteHero`, wrap the `StatusPill` passed to `status`:
```tsx
status={
  <span data-tour="site-status" className="inline-flex">
    <StatusPill tone={published ? "live" : "draft"} onDark>
      {published ? "Published" : "Draft"} ·{" "}
      {value.role === "admin" ? "Sulvatech admin" : value.role === "owner" ? "Owner" : "Staff"}
    </StatusPill>
  </span>
}
```

- [ ] **Step 6: `src/app/dashboard/page.tsx`** — on `<ul className="grid gap-4 sm:grid-cols-2">` add `data-tour="site-cards"`.

- [ ] **Step 7: `src/app/admin/sites/page.tsx`**

Add import `import { TourContextSync } from "@/components/tour/TourProvider";`.
On `<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">` add `data-tour="sites-list"`.
Immediately before the `{error ? (` block in the returned JSX add:
```tsx
<TourContextSync firstSiteId={sites[0]?.id} />
```

- [ ] **Step 8: `src/app/admin/sites/new/page.tsx`** — on the `<Tabs ... items={[{ id: "assistant" ... }, { id: "manual" ... }]} />` add prop `tourId="assistant-mode"`.

- [ ] **Step 9: `src/components/admin/SiteAssistant.tsx`** — on the main returned outer `<div className="flex flex-col rounded-3xl bg-white p-0 ...">` (around line 321) add `data-tour="assistant-chat"`.

- [ ] **Step 10: `src/app/admin/sites/[siteId]/page.tsx`** — in the `view === "settings"` branch wrap:
```tsx
<div data-tour="ai-content">
  <AiSiteContentGenerator siteId={siteId} templateKey={site.template_key} />
</div>

<div data-tour="ai-seo-all">
  <AiSeoAllPages siteId={siteId} />
</div>
```

- [ ] **Step 11: `AdminSiteChrome.tsx`** — on its `<Tabs ...>` render add `tourId="site-tabs"`.

- [ ] **Step 12: Verify all targets exist**

Run (Bash):
```bash
for t in site-cards site-status site-tabs tab- tour-button sites-list nav-users new-site assistant-mode assistant-chat ai-content ai-seo-all; do printf "%s: " "$t"; grep -rl "$t" src --include=*.tsx | wc -l; done
```
Expected: every count ≥ 1.

- [ ] **Step 13: Full checks + commit**

Run: `npm test`, `npm run typecheck`, `npm run lint` — all pass.
```bash
git add src/components/ui/Tabs.tsx src/components/ui/GlassNav.tsx src/app/admin/layout.tsx src/components/dashboard/DashboardShell.tsx src/components/dashboard/SiteShell.tsx src/app/dashboard/page.tsx src/app/admin/sites/page.tsx src/app/admin/sites/new/page.tsx src/components/admin/SiteAssistant.tsx "src/app/admin/sites/[siteId]/page.tsx" src/components/admin/site/AdminSiteChrome.tsx
git commit -m "tour: mount tours in admin and dashboard shells, tag targets"
```

---

### Task 6: Browser verification

**Files:** none (fixes go back into the relevant task files)

- [ ] **Step 1:** Start dev server via `preview_start` (create `.claude/launch.json` with `npm run dev`, port 3000, if missing). Note: Supabase may be unreachable (see env constraints); if `/admin` cannot load data, report that and verify what renders.
- [ ] **Step 2: Admin** — clear `sulva.tour.admin.done` in localStorage, open `/admin/sites`: welcome card appears after ~0.7 s. Walk every step; confirm navigation to `/admin/sites/new` and `/admin/sites/<id>?view=settings`, spotlight on each target, counter correct, Done marks flag.
- [ ] **Step 3: Skip paths** — reload with flag cleared: "Skip" on welcome sets flag, no re-show on reload. Start via Tour button, press `Esc` mid-tour. Start again, click browser Back mid-tour → tour ends.
- [ ] **Step 4: Owner** — `/dashboard/<id>` as owner and staff if accounts available (otherwise admin viewing a site): tabs steps match visible tabs; shop step only on t13/t14.
- [ ] **Step 5: Mobile** — `resize_window` preset mobile: tooltip is bottom sheet; Users step auto-skips (link in hamburger). Reset to desktop after.
- [ ] **Step 6: Keyboard** — Tab cycles within tooltip buttons only; ←/→ work.
- [ ] **Step 7:** `read_console_messages` onlyErrors → none from tour. Screenshot a spotlighted step as proof.
- [ ] **Step 8:** Commit any fixes with message `tour: fixes from browser verification`.
