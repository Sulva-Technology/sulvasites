# Insights: privacy-friendly site analytics (back-office part 4)

Date: 2026-10-05. Depends on: owner accounts (005, 007), commerce (006), inbox (008). Migration `011_insights.sql` (010 reserved).

## Goal
Owner (and Sulvatech admin) sees how the public site performs: views, visitors, top pages, referrers,
devices, plus shop revenue/orders and inbox counts. No cookies, no raw IP/UA stored, no consent banner needed.

## Data: `page_views`
`id bigint identity, site_id, path (<=200, query/hash stripped), referrer_host (host only, <=100, null when
direct/internal), device (desktop|mobile|tablet), country (2 letters, null), visitor (32 hex), created_at`.
- Visitor hash = `sha256(secret | UTC day | siteId | ip | ua)` truncated to 32 hex, computed in the route
  (`src/lib/insights/visitor.ts`). The day is part of the input, so the hash rotates daily and cannot link a
  person across days; "visitors" for a period is the sum of daily unique visitors (documented in the UI).
  Secret: `INSIGHTS_SALT` env, falling back to `SUPABASE_SERVICE_ROLE_KEY`. Neither is ever stored.
- RLS on, `revoke all` from anon/authenticated; insert only by service role (the beacon route). No direct select:
  clients read aggregates through `insights_overview(site, days)` (SECURITY DEFINER, requires
  `can_edit_site` = owner or admin; the must_change_password gate from 007 applies via `site_role`).
- Indexes: `(site_id, created_at desc)`, `(created_at)` for purge.
- Retention: `purge_page_views(keep_days default 90)`, service_role only. Schedule with pg_cron
  (`select cron.schedule('purge-page-views','17 3 * * *','select public.purge_page_views()')`) or call from any
  scheduler. The dashboard offers 7/30/90 days so 90 days is the floor.

## Beacon `POST /api/sites/[siteId]/track`
No auth, no cookies, always `204` (or 4xx on malformed/limited). Order: canonical UUID -> DNT/GPC headers ->
per-IP limit -> body cap (1 KB) -> strict parse (path starts with `/`, no control chars, <=200; referrer <=300) ->
bot UA ignored -> published-site check -> per-IP+site and per-site limits -> insert. Failures never surface to
the visitor. Order pages (`/shop/order/<ref>`) are collapsed so references never reach analytics.
Client `InsightsBeacon` (mounted in `PublicSitePage` and `PublicShopPage` only, never in admin preview) sends
`navigator.sendBeacon` (text/plain, no preflight) on pathname change; skips when DNT/GPC is set.

## Aggregation
`insights_overview(p_site, p_days in 7|30|90)` -> jsonb: `totals` (views, visitors, previous period),
`daily` (gap-filled, Africa/Lagos days), `top_pages`, `top_referrers`, `devices`, `shop` (paid orders, revenue kobo,
daily revenue, top products; null if no orders table access needed? always returned, UI shows only for shop
templates), `inbox` (enquiries, bookings, unread). Pure TS (`src/lib/insights/*`) parses it defensively and
handles period math/formatting.

## UI
`/dashboard/[siteId]/insights` (owner, admin) and `/admin/sites/[siteId]/insights`: shared `InsightsView`:
period switcher, KPI tiles with change vs previous period, accessible inline-SVG bar chart (with data table),
top pages / referrers tables, device split, shop section for shop templates only, empty state.
`tabsForRole`: owner and admin get `insights`; staff do not (decision: analytics are owner business info).

## Out of scope
Geo breakdown UI, custom events, bot-score tuning, real-time view.
