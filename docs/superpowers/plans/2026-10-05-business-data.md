# Business data managers: implementation plan

Spec: docs/superpowers/specs/2026-10-05-business-data-design.md

1. Migration + SQL check: `supabase/migrations/009_business_data.sql`, `supabase/tests/009_business_data_check.sql`.
2. Pure lib `src/lib/businessData/` (types, price, kinds, validate, merge, seed) with `tests/businessData.test.mjs`.
3. Access: `tabsForRole` `business` option + `canManageBusinessData` (+ tests in `tests/siteAccess.test.mjs`); SiteShell wiring.
4. Public render: `load.server.ts` (fail-soft) + merge in `PublicSitePage`.
5. UI: `src/components/business/` (BusinessIndex, BusinessManager, ItemForm); dashboard + admin routes; admin overview button.
6. Verify: npm test, eslint, tsc; dev server with a temporary sample page (removed) for merged template render and form validation.
7. Commits: (a) migration + SQL test, (b) lib + tests + access, (c) render + UI + routes, (d) docs.
