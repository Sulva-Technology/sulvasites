# Business data managers (back office, part 3)

Date: 2026-10-05. Depends on: owner accounts (005, 007), inbox (008) style.

## Goal
Owners and staff keep their business lists (menu, timetable, doctors, services, programmes, packages,
projects/properties) up to date in friendly forms, and the public website shows them, without raw section editing
and without rewriting the 14 templates.

## Decisions
- ONE generic table `business_items` (migration 009): `site_id, kind, position, name, price_kobo bigint, data jsonb, active`.
  Per-kind shape of `data` enforced by `business_item_data_ok(kind, data)` in a CHECK (known keys only, types,
  length caps, https-only image URLs, enums, HH:MM times, end after start). Prices are integer kobo (0 .. 10^12).
- Kinds: `menu_item`, `timetable_slot`, `doctor`, `service`, `programme`, `package`, `project`.
- Which managers a site sees comes from its template's category (`categoryForTemplate`, the stock-photo category):
  food -> Menu; clinic -> Doctors + Treatments; fitness -> Timetable; education -> Programmes; events -> Packages;
  construction -> Projects + Services; real estate -> Properties (project kind, property statuses);
  creative -> Work + Services; beauty/corporate/tech/other -> Services; shop templates (t13/t14) -> none (Shop tab).
  Wording is overridden per category (`kinds.ts` OVERRIDES). No category offers two kinds for one section target (tested).
- RLS: public read of ACTIVE items of PUBLISHED sites; members (owner AND staff, per the owner-accounts spec) and admins
  read all and insert/update/delete on their site. The 007 `must_change_password` gate applies through `is_site_member()`.
  Guard trigger: `site_id`, `kind`, `id`, `created_at` immutable for client roles (same-site integrity), 500 items per site
  cap, `updated_at` maintained. anon cannot write.
- Rendering without touching templates: `PublicSitePage` merges active items into the section arrays the templates already
  render, via pure `src/lib/businessData/merge.ts`:
  - target `services` (menu, timetable, services, programmes, packages): `{title, desc}`, price/duration/day-time folded
    into `desc` (e.g. "₦3,500 · Smoky jollof · (Halal, Spicy)");
  - target `team` (doctors): `{name, role: specialty, bio (+ consultation fee), photoUrl}`;
  - target `use_cases` (projects): `{title, description: location · status · price · text}`;
  - photos of menu items / projects are appended to `gallery` sections (de-duplicated, max 12 added).
  Sections of a target are replaced only when the site has at least one ACTIVE item of the manager that owns it;
  otherwise the page content is untouched (existing sites and pre-migration databases keep working; the loader fails soft).
  Items of kinds the template does not offer are ignored. Menu items are grouped by their "menu section"; timetables are
  sorted by day then time automatically. When the site has other published pages, the home page shows a teaser
  (6 services/projects, 4 doctors).
- Seeding: "Import from my site content" reads the site's `pages` + `extra_pages` and creates items from the matching
  sections (services -> services-target kind, team -> doctors, use_cases -> projects), skipping blanks and names that already exist.
- Dashboard: Business tab index lists the template's managers with counts; `/dashboard/[siteId]/business/[kind]` is the
  manager (add, edit, delete with confirm, up/down within a group, on/off switch, empty states, import). Hidden for
  templates without managers (`tabsForRole(..., { business: false })`). Admin gets the same at
  `/admin/sites/[siteId]/business[/kind]` (button on the site overview).
- Roles (`canManageBusinessData`): owner, staff and admin.

## Out of scope / follow-ups
Template-specific rich rendering of price/photo/day fields (all values currently ride in the existing text fields),
travel "tours" template, bulk edit, atomic reorder RPC, per-site storage-URL check on image links, insights (part 4).

## USER ACTION
Run `supabase/migrations/009_business_data.sql` then `supabase/tests/009_business_data_check.sql` in the SQL editor
(expect `ALL CHECKS PASSED`).
