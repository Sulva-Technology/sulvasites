# Site owner accounts & dashboard (back office, part 1 of 4)

Date: 2026-10-04 · Status: approved

## Context

The back office lets each client business run its site. Four parts, built in order:
1. **Owner accounts & access** (this spec)
2. Bookings & enquiries inbox (template forms → DB → dashboard inbox + email)
3. Per-template business data managers (menu, timetable, doctors, programmes, packages, projects)
4. Insights (visits / enquiries per site)

Today only Sulvatech staff (`public.admin_users`, `public.is_admin()`) can log in; all RLS is admin-only
plus public read of published content. A parallel workstream adds user creation with a shared default
password and `app_metadata.must_change_password` (`src/app/api/admin/users/route.ts`,
`src/lib/supabase/admin.server.ts` `supabaseService()`, `src/lib/supabase/requireAdmin.server.ts`
`requireAdmin()`/`rateLimit()`, `/change-password`). This spec builds on it and must not start
implementation until that work is committed.

## Decisions

- Roles per site: **owner** and **staff**. A user may belong to several sites.
- **Owner**: edit own site's content (pages, extra pages, business profile, logo/images) and publish/unpublish pages; manage the site's staff; use inbox/business tabs (parts 2–3).
- **Staff**: read own site; inbox/business tabs (parts 2–3); no content edits, no publishing, no team management.
- **Sulvatech-only** (never owners): template choice, slug, palette/theme colours, site status, domains, deleting sites, inviting the first owner.
- Sulvatech admins keep full access everywhere (unchanged).

## Data model (migration `supabase/migrations/005_site_members.sql`)

```sql
create table public.site_members (
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (site_id, user_id)
);
create index site_members_user_idx on public.site_members(user_id);
```

Helpers (security definer, `search_path = public, auth`, granted to `authenticated`):
- `public.site_role(p_site uuid) returns text` — the caller's role on the site, or null.
- `public.is_site_member(p_site uuid) returns boolean` — `is_admin() or site_role(p_site) is not null`.
- `public.can_edit_site(p_site uuid) returns boolean` — `is_admin() or site_role(p_site) = 'owner'`.

RLS (added alongside existing policies, which stay):
- `site_members`: select where `is_site_member(site_id)`; insert/update/delete via server route only (service role) — no client write policy except admins (`is_admin()`).
- `sites`: select where `is_site_member(id)`; update where `can_edit_site(id)` **plus** trigger guard below.
- `business_profiles`, `pages`: select where `is_site_member(site_id)`; **update only** where `can_edit_site(site_id)` (owners cannot insert/delete profiles or core home/about/contact pages, so the palette guard cannot be bypassed by delete + re-insert).
- `extra_pages`: select where `is_site_member(site_id)`; full insert/update/delete where `can_edit_site(site_id)`.
- `assets`: select/insert/delete where `can_edit_site(site_id)`; storage `site-assets` objects: owners may write under the `<siteId>/` prefix of sites they can edit (policy using the strictly validated UUID in `split_part(name,'/',1)`; non-UUID prefixes are denied by RLS, not a cast error).
- `domains`: unchanged (admins + public read active).

Guard triggers (raise `'Only Sulvatech can change this setting.'`). They are **not** SECURITY DEFINER and are gated on `current_user in ('authenticated','anon') and not is_admin()`, so service_role / postgres (server routes, ops) pass through while client JWT roles are restricted:
- `sites_owner_guard` before update on `sites`: `template_key`, `slug` or `status` changed.
- `profiles_owner_guard` before insert or update on `business_profiles`: on insert `theme_colors`/`brand_colors` must be null; on update neither may change.
- `sites` insert/delete stay admin-only (no owner policy).

## Accounts

- **Invite owner (admin)**: on `/admin/sites/[siteId]`, a "Team" card → `POST /api/admin/sites/[siteId]/members` `{ email, role: 'owner' }`.
  `requireAdmin` + `rateLimit`; finds the auth user by email or creates one (default password, `must_change_password: true`), then upserts `site_members`.
  Does **not** insert into `admin_users`. Returns `{ userId, email, role, created: boolean }` (no passwords in responses).
- **Invite/remove staff (owner)**: `POST/DELETE /api/sites/[siteId]/members` — new `requireSiteRole(req, siteId, ['owner'])` server helper
  (verifies bearer token like `requireAdmin`, then `site_role`), service client for user creation. Owners may add only `staff`;
  may remove staff; may not remove the last owner or themselves if they are the last owner. Admin route can do all.
- Login is shared (`/login`). After sign-in: `must_change_password` → `/change-password`; else admin → `/admin`;
  else member of ≥1 site → `/dashboard`; else "no access" message with sign-out.

## Dashboard UI

- `src/components/RequireMember.tsx` — client guard (session, must_change_password, membership via `site_members` select);
  exposes `{ userId, sites: Array<{ site, role }> }` through context. Admins pass too (they see all sites).
- `/dashboard` — site list (single site → redirect to it).
- `/dashboard/[siteId]` layout with tabs, role-aware:
  - **Overview** — site name, live link, page publish states (all members).
  - **Content** (owner) — pages, extra pages, business profile + logo; reuses existing editors.
  - **Inbox** (all) — placeholder card "Coming soon" (part 2).
  - **Business** (all) — placeholder card (part 3).
  - **Team** (owner) — list members, invite staff by email, remove staff.
- Editor reuse: extract the bodies of `src/app/admin/sites/[siteId]/pages/[key]/page.tsx`,
  `.../extra-pages/[key]/page.tsx` and the profile/logo parts of `/admin/sites/[siteId]/page.tsx` into components under
  `src/components/site-editor/` taking `{ siteId, mode: 'admin' | 'owner' }`. `mode='owner'` hides template, palette, slug,
  status and domains controls. Admin routes render them with `mode='admin'` (no behaviour change for admins).
- Visual style: same Tailwind admin look; header shows site name + "Signed in as" + sign out.

## Error handling

- Permission failures from RLS/trigger surface as friendly messages via `formatSupabaseError`.
- API routes: 401 unauthenticated, 403 wrong role, 404 unknown site, 409 already a member, 429 rate limited.
- Removing the last owner → 400 with explanation.

## Testing

- `tests/siteAccess.test.mjs` — pure helpers in `src/lib/siteAccess.ts`: `postLoginRoute({isAdmin, mustChange, memberships})`,
  `tabsForRole(role)`, `canInvite(actorRole, targetRole)`, `canRemove(actorRole, target, owners)`.
- `supabase/tests/005_site_members_check.sql` — manual script run in the SQL editor: creates temp users/site, uses
  `set local role authenticated; set local request.jwt.claims` to assert owner/staff/outsider read/write outcomes and the guard trigger.
- Browser: owner login → dashboard → edit + publish a page; staff login → no Content/Team tabs; outsider → no access.

## Out of scope (later parts)

Inbox and form storage (2), structured business data (3), insights (4), billing, custom roles, email delivery of invites
(credentials are shared out of band, as for admins today).
