# On-screen product tour — design

Date: 2026-10-05
Status: approved in chat, pending spec review

## Goal

Teach newcomers how to navigate Sulva Sites with a spotlight tour that points at the real UI.
Two audiences, one engine:

- **Owner tour** — business owners/staff in `/dashboard/[siteId]`.
- **Admin tour** — Sulvatech staff in `/admin`, including a chapter on the AI tools.

The tour can be launched anytime from a header button and auto-starts once on first visit.

## Decisions

| Topic | Decision |
|---|---|
| Audience | Both surfaces; shared engine, separate step sets |
| Style | Spotlight coach-marks (dim page, cutout around target, tooltip card) |
| Implementation | Hand-rolled, no new dependency |
| Targets | `data-tour="<id>"` attributes on real elements |
| First-visit memory | `localStorage` (`sulva.tour.<tourId>.done`), no DB migration |
| Skip | Welcome card "Skip", "Skip tour" on every step, `Esc` |
| AI in owner tour | No — AI is admin-only today (`showAi = mode === "admin"`). Exposing AI to owners is a separate follow-up |

## Architecture

```
src/lib/tour/            pure, unit-tested
  types.ts               TourStep, TourDef, TourContext
  steps.ts               filterSteps(def, ctx) -> visible steps
  placement.ts           placeTooltip(targetRect, tooltipSize, viewport) -> {top,left,side}
  storage.ts             isDone(id) / markDone(id) — try/catch-wrapped localStorage
src/components/tour/
  TourProvider.tsx       context: startTour(id), current step, next/back/skip
  TourOverlay.tsx        dim layer + spotlight cutout + tooltip card (Koi styling)
  TourButton.tsx         "Take the tour" header button
  tours/ownerTour.ts     owner step defs
  tours/adminTour.ts     admin step defs
```

### Data model

```ts
type TourStep = {
  id: string;
  target?: string;          // data-tour id; absent = centered card (welcome/finale)
  route?: (ctx) => string;  // navigate here before showing step
  title: string;
  body: string;
  when?: (ctx) => boolean;  // hide step when false
};
type TourContext = { role: "owner" | "staff" | "admin"; templateKey?: string;
                     siteId?: string; firstSiteId?: string; hasShop: boolean; hasBusiness: boolean };
```

`when` reuses `tabsForRole` / `templateSupportsShop` / `kindsForTemplate` so the tour never points
at a tab the user cannot see.

### Mounting

- `AdminLayout` wraps children in `<TourProvider tour="admin">`; `TourButton` added to the `right` slot.
- `DashboardShell` wraps in `<TourProvider tour="owner">`; `TourButton` added beside `DashboardUser`.
- `SiteShell` publishes its `SiteContextValue` to the provider (role, template, siteId) so owner
  steps can filter.

### Flow

1. On mount, if `!isDone(tourId)`, show the **welcome card**: "Show me around" / "Skip".
   Skip → `markDone`. Auto-start only on `/admin/sites` and `/dashboard*` landing pages.
2. Each step: if `route` differs from current path, `router.push(route)`, then poll for
   `[data-tour=target]` (rAF, max 3s). Not found → silently advance to next step.
3. Target found → `scrollIntoView({block:"center"})`, measure rect, render cutout + tooltip.
   Re-measure on resize/scroll.
4. Finish or skip → `markDone`, overlay unmounts, focus returns to `TourButton`.
5. `TourButton` always restarts from step 1 regardless of done state.

### Overlay & accessibility

- Cutout: single fixed full-screen element with `box-shadow: 0 0 0 9999px rgba(10,15,31,.6)`
  positioned over target rect, 8px padding, rounded. Clicks on the dim layer do nothing (no
  accidental navigation).
- Tooltip: `role="dialog"`, `aria-labelledby` title, focus moved to it, focus trapped.
  Buttons: Back, Next/Done, "Skip tour" link, plus "3 of 9" counter.
- Keys: `→` next, `←` back, `Esc` skip.
- `prefers-reduced-motion`: no transitions, instant scroll.
- Width < 640px: tooltip docks as bottom sheet instead of floating.

## Tour content

### Owner tour (`/dashboard`)

0. *(on `/dashboard` site list, user has >1 site)* Site card — "Pick a site to manage."
1. Welcome (centered) — "This is your site's back office."
2. Status pill — Draft vs Published.
3. Tabs bar — the sections of your back office.
4. Content tab — edit text and images on your pages.
5. Inbox tab + unread badge — enquiries and bookings land here.
6. Business tab *(when template has business data kinds)* — menu, timetable, etc.
7. Shop tab *(shop templates)* — products and orders.
8. Insights tab — visitors and top pages.
9. Team tab *(owners only)* — invite staff.
10. Tour button — "Replay this tour anytime here."

### Admin tour (`/admin`)

1. Welcome (centered).
2. Sites list.
3. Users nav — create owner accounts.
4. "New site" button.

**AI chapter**

5. *(route `/admin/sites/new`)* Site Assistant chat — describe the business in one message;
   starter chips.
6. Assistant setup steps — logo, colours, photos, then build.
7. *(route `/admin/sites/<firstSiteId>`, skipped if no sites)* AI content generator — rewrite all
   copy from the brief.
8. AI SEO all pages — titles, descriptions, alt text in one go.
9. Page editor hint (centered card, no navigation) — "Inside any page editor, the
   *AI: improve SEO* button does the same for one page. Click **Save Draft** to keep results."
10. Site detail tabs — pages, business, inbox, shop, insights, preview.
11. Tour button — replay anytime.

Tours highlight tabs rather than opening each tab, keeping the tour fast and independent of
per-tab data.

## `data-tour` attributes to add

`Tabs` gains optional per-item `tourId` → renders `data-tour`. Other targets get attributes
directly: status pill, site cards, sites list, "New site" button, Users nav link (via `NavLink`
optional `tourId`), Site Assistant chat box + setup area, `AiSiteContentGenerator`,
`AiSeoAllPages`, site detail tabs, `TourButton`.

## Error handling

- Missing target → skip step (never dead-end).
- `localStorage` unavailable → treated as not done; tour may re-show, still skippable.
- User navigates away mid-tour (pathname change not initiated by the tour) → tour ends and is
  marked done; the user chose to leave and can replay from the button.

## Testing

- `tests/tourSteps.test.mjs` — `filterSteps` by role/template (staff hides Team, non-shop hides
  Shop, admin with no sites drops steps 7–8).
- `tests/tourPlacement.test.mjs` — placement flips side near edges, bottom-sheet under 640px,
  clamps inside viewport.
- `tests/tourStorage.test.mjs` — throws-on-access storage treated as not done, no crash.
- Manual in browser preview: owner (shop + non-shop template, staff role), admin with/without
  sites, mobile width, keyboard-only, skip at each point.

## Out of scope

- Exposing AI tools to owners (follow-up).
- Checklist widget / progress tracking.
- Server-side completion tracking.
