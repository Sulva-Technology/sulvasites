# Site Owner Accounts & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each client business sign in to `/dashboard` as an owner or staff member of their site, with owners able to edit and publish their own content and manage staff, enforced by Postgres RLS.

**Architecture:** A `site_members` table plus security-definer helpers drive new RLS policies and guard triggers (Sulvatech-only fields stay admin-only). Server routes (bearer-token checked) create/attach users with the service role. A `RequireMember` client guard and `/dashboard/[siteId]` tabbed UI reuse the existing page/profile editors, extracted into shared components with an `admin | owner` mode.

**Tech Stack:** Next.js 16 app router (client components), React 19, Supabase JS v2 (RLS, auth admin API via service role), Postgres, Tailwind, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-04-owner-accounts-design.md`

## Global Constraints

- **Prerequisite:** the parallel auth work (`src/lib/supabase/admin.server.ts` `supabaseService()`/`defaultNewUserPassword()`, `src/lib/supabase/requireAdmin.server.ts` `requireAdmin()`/`rateLimit()`, `/change-password`, `app_metadata.must_change_password`) must be committed before Task 3. Never edit or commit another session's uncommitted files; commit with `git commit --only -- <paths>`.
- Roles exactly `'owner' | 'staff'`. Sulvatech admins (`is_admin()`) keep full access.
- Owner-forbidden fields: `sites.template_key`, `sites.slug`, `sites.status`, `business_profiles.theme_colors`, `business_profiles.brand_colors`; sites insert/delete; `domains` writes. Error text: `Only Sulvatech can change this setting.`
- Modules loaded by `npm test` use relative `.ts` imports.
- Existing source files are CRLF: edit with the Edit tool. Commit messages end with a blank line + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- API errors: 401 unauthenticated, 403 wrong role, 404 unknown site, 409 already a member, 429 rate limited, 400 last-owner removal.
- No passwords in API responses or logs.

---

### Task 1: Migration + SQL check script

**Files:** Create `supabase/migrations/005_site_members.sql`, `supabase/tests/005_site_members_check.sql`.

**Interfaces — Produces:** table `public.site_members(site_id, user_id, role, invited_by, created_at)`; functions `public.site_role(uuid) → text`, `public.is_site_member(uuid) → boolean`, `public.can_edit_site(uuid) → boolean`.

- [ ] **Step 1: Write the migration**

```sql
-- 005_site_members.sql — run once in Supabase SQL Editor (after schema.sql, 001-004).
create table if not exists public.site_members (
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (site_id, user_id)
);
create index if not exists site_members_user_idx on public.site_members(user_id);
alter table public.site_members enable row level security;

create or replace function public.site_role(p_site uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select sm.role from public.site_members sm where sm.site_id = p_site and sm.user_id = auth.uid();
$$;
create or replace function public.is_site_member(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_admin() or public.site_role(p_site) is not null;
$$;
create or replace function public.can_edit_site(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_admin() or public.site_role(p_site) = 'owner';
$$;
grant execute on function public.site_role(uuid), public.is_site_member(uuid), public.can_edit_site(uuid) to authenticated;

-- site_members: members can see their site's team; writes are admin-only from the client (server routes use the service role).
drop policy if exists site_members_read on public.site_members;
create policy site_members_read on public.site_members for select to authenticated using (public.is_site_member(site_id));
drop policy if exists site_members_admin_write on public.site_members;
create policy site_members_admin_write on public.site_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- sites
drop policy if exists members_read_sites on public.sites;
create policy members_read_sites on public.sites for select to authenticated using (public.is_site_member(id));
drop policy if exists owners_update_sites on public.sites;
create policy owners_update_sites on public.sites for update to authenticated
  using (public.can_edit_site(id)) with check (public.can_edit_site(id));

-- content tables
do $$
declare t text;
begin
  foreach t in array array['business_profiles','pages','extra_pages'] loop
    execute format('drop policy if exists members_read on public.%I', t);
    execute format('create policy members_read on public.%I for select to authenticated using (public.is_site_member(site_id))', t);
    execute format('drop policy if exists owners_write on public.%I', t);
    execute format('create policy owners_write on public.%I for all to authenticated using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id))', t);
  end loop;
end $$;

-- assets
drop policy if exists owners_assets on public.assets;
create policy owners_assets on public.assets for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- storage: owners write under <siteId>/ of sites they can edit
drop policy if exists "Owners manage own site-assets" on storage.objects;
create policy "Owners manage own site-assets" on storage.objects for all to authenticated
  using (bucket_id = 'site-assets' and public.can_edit_site(case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then split_part(name,'/',1)::uuid end))
  with check (bucket_id = 'site-assets' and public.can_edit_site(case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then split_part(name,'/',1)::uuid end));

-- guards: Sulvatech-only fields
create or replace function public.sites_owner_guard() returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() and (new.template_key is distinct from old.template_key
      or new.slug is distinct from old.slug or new.status is distinct from old.status) then
    raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists sites_owner_guard on public.sites;
create trigger sites_owner_guard before update on public.sites for each row execute function public.sites_owner_guard();

create or replace function public.profiles_owner_guard() returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() and (new.theme_colors is distinct from old.theme_colors
      or new.brand_colors is distinct from old.brand_colors) then
    raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_owner_guard on public.business_profiles;
create trigger profiles_owner_guard before update on public.business_profiles for each row execute function public.profiles_owner_guard();
```


- [ ] **Step 2: Write `supabase/tests/005_site_members_check.sql`** — a transaction that inserts a temp site + three auth users (owner, staff, outsider) via `insert into auth.users(id, email) ...` (or uses existing user ids passed via `\set`), adds memberships, then for each user `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', <id>, 'role','authenticated')::text, true);` and asserts with `do $$ begin ... if not ... then raise exception 'FAIL: ...'; end if; end $$;`:
  owner can select site and update a page + profile; owner update of `sites.slug` raises; owner update of `theme_colors` raises; staff can select but page update affects 0 rows; outsider selects 0 sites; ends with `rollback;` and a final `select 'ALL CHECKS PASSED';` before rollback.
- [ ] **Step 3:** Self-check SQL syntax by reading carefully (no DB access in CI). Commit "Add site_members migration and RLS check script".

### Task 2: Pure access helpers (TDD)

**Files:** Create `src/lib/siteAccess.ts`, `tests/siteAccess.test.mjs`.

**Interfaces — Produces:**
```ts
export type SiteRole = "owner" | "staff";
export type Membership = { siteId: string; role: SiteRole };
export type DashboardTab = "overview" | "content" | "inbox" | "business" | "team";
export function postLoginRoute(i: { isAdmin: boolean; mustChangePassword: boolean; memberships: Membership[] }): string;
export function tabsForRole(role: SiteRole | "admin"): DashboardTab[];
export function canInvite(actor: SiteRole | "admin", target: SiteRole): boolean;
export function canRemove(actor: SiteRole | "admin", target: { role: SiteRole; userId: string }, ctx: { actorId: string; ownerCount: number }): { ok: true } | { ok: false; reason: string };
```

- [ ] **Step 1: Failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { canInvite, canRemove, postLoginRoute, tabsForRole } from "../src/lib/siteAccess.ts";

test("postLoginRoute", () => {
  assert.equal(postLoginRoute({ isAdmin: true, mustChangePassword: true, memberships: [] }), "/change-password");
  assert.equal(postLoginRoute({ isAdmin: true, mustChangePassword: false, memberships: [] }), "/admin/sites");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [{ siteId: "a", role: "staff" }] }), "/dashboard/a");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [{ siteId: "a", role: "owner" }, { siteId: "b", role: "staff" }] }), "/dashboard");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [] }), "/no-access");
});

test("tabsForRole", () => {
  assert.deepEqual(tabsForRole("owner"), ["overview", "content", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("admin"), ["overview", "content", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("staff"), ["overview", "inbox", "business"]);
});

test("canInvite", () => {
  assert.equal(canInvite("admin", "owner"), true);
  assert.equal(canInvite("owner", "staff"), true);
  assert.equal(canInvite("owner", "owner"), false);
  assert.equal(canInvite("staff", "staff"), false);
});

test("canRemove", () => {
  assert.deepEqual(canRemove("owner", { role: "staff", userId: "s" }, { actorId: "o", ownerCount: 1 }), { ok: true });
  assert.equal(canRemove("owner", { role: "owner", userId: "o2" }, { actorId: "o", ownerCount: 2 }).ok, false);
  assert.equal(canRemove("staff", { role: "staff", userId: "s" }, { actorId: "x", ownerCount: 1 }).ok, false);
  assert.equal(canRemove("admin", { role: "owner", userId: "o" }, { actorId: "a", ownerCount: 1 }).ok, false);
  assert.deepEqual(canRemove("admin", { role: "owner", userId: "o" }, { actorId: "a", ownerCount: 2 }), { ok: true });
});
```

- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
// Relative-import-safe pure helpers for site membership rules.
export type SiteRole = "owner" | "staff";
export type Membership = { siteId: string; role: SiteRole };
export type DashboardTab = "overview" | "content" | "inbox" | "business" | "team";

export function postLoginRoute(i: { isAdmin: boolean; mustChangePassword: boolean; memberships: Membership[] }): string {
  if (i.mustChangePassword) return "/change-password";
  if (i.isAdmin) return "/admin/sites";
  if (i.memberships.length === 1) return `/dashboard/${i.memberships[0]!.siteId}`;
  if (i.memberships.length > 1) return "/dashboard";
  return "/no-access";
}

export function tabsForRole(role: SiteRole | "admin"): DashboardTab[] {
  return role === "staff" ? ["overview", "inbox", "business"] : ["overview", "content", "inbox", "business", "team"];
}

export function canInvite(actor: SiteRole | "admin", target: SiteRole): boolean {
  if (actor === "admin") return true;
  return actor === "owner" && target === "staff";
}

export function canRemove(
  actor: SiteRole | "admin",
  target: { role: SiteRole; userId: string },
  ctx: { actorId: string; ownerCount: number },
): { ok: true } | { ok: false; reason: string } {
  if (actor === "staff") return { ok: false, reason: "Only owners can remove team members." };
  if (actor === "owner" && target.role === "owner") return { ok: false, reason: "Only Sulvatech can remove an owner." };
  if (target.role === "owner" && ctx.ownerCount <= 1) return { ok: false, reason: "A site needs at least one owner." };
  return { ok: true };
}
```

- [ ] **Step 4:** `npm test` → PASS. **Step 5:** commit "Add site access helpers".

### Task 3: Server role check + member API routes

**Files:** Create `src/lib/supabase/requireSiteRole.server.ts`, `src/app/api/admin/sites/[siteId]/members/route.ts`, `src/app/api/sites/[siteId]/members/route.ts`.

**Interfaces:**
- `requireSiteRole(req: Request, siteId: string, roles: Array<"owner"|"staff"|"admin">): Promise<{ ok: true; userId: string; role: "owner"|"staff"|"admin" } | { ok: false; response: NextResponse }>` — same bearer-token verification as `requireAdmin` (copy its structure; anon client with the user's token), then `rpc("is_admin")` → "admin", else `rpc("site_role", { p_site: siteId })`; 404 if the site doesn't exist for admins (`sites` select), 403 if role not allowed.
- Shared helper in the same file: `findOrCreateUser(email): Promise<{ userId: string; created: boolean }>` using `supabaseService()` — `auth.admin.listUsers` paged search by email (or `getUserByEmail` if available in installed supabase-js), else `createUser({ email, password: defaultNewUserPassword(), email_confirm: true, app_metadata: { must_change_password: true } })`.
- Admin route: `GET` → members list `[{ userId, email, role, createdAt }]` (emails via service `auth.admin.getUserById`); `POST { email, role }` (`requireAdmin`, `rateLimit`, `canInvite("admin", role)`) → upsert membership → `{ userId, email, role, created }`; `DELETE { userId }` → `canRemove("admin", …)`.
- Owner route: same shapes; `requireSiteRole(req, siteId, ["owner","admin"])` for POST/DELETE, `["owner","staff","admin"]` for GET; uses `canInvite`/`canRemove` with the actor's role; 409 when already a member.
- [ ] Steps: implement, `npx tsc --noEmit`, eslint, commit "Add site member API routes". (No unit tests beyond Task 2 helpers; routes are thin.)

### Task 4: Login routing, RequireMember guard, dashboard shell

**Files:** Modify `src/app/login/page.tsx` (post-login redirect uses `postLoginRoute` with `rpc("is_admin")` + `site_members` select for the user + `must_change_password`); create `src/app/no-access/page.tsx`; create `src/components/RequireMember.tsx` (context `{ userId, isAdmin, memberships: Array<{ siteId, role, site: { id, slug, template_key, status }, businessName }> }`, redirects like `RequireAdmin`); create `src/app/dashboard/layout.tsx` (wraps RequireMember, header with "Sulva Sites · Dashboard", signed-in email, sign out); `src/app/dashboard/page.tsx` (site cards; one site → redirect); `src/app/dashboard/[siteId]/layout.tsx` (tab nav from `tabsForRole`, 404-style message if not a member); `src/app/dashboard/[siteId]/page.tsx` (Overview: name, live URL using `NEXT_PUBLIC_PLATFORM_DOMAIN` subdomain, page list with status); `src/app/dashboard/[siteId]/inbox/page.tsx` and `business/page.tsx` ("Coming soon" cards).
- Also: `RequireAdmin` "not admin" state — if the user has memberships, redirect to `/dashboard` instead of showing the error (edit only after the parallel work is committed).
- [ ] Verify tsc/eslint; commit "Add owner dashboard shell and login routing".

### Task 5: Extract editors into shared components

**Files:** Create `src/components/site-editor/PageEditor.tsx`, `ExtraPageEditor.tsx`, `ProfileEditor.tsx` (props `{ siteId: string; pageKey?: string; mode: "admin" | "owner" }`); modify the three admin pages to render them with `mode="admin"` (no behaviour change).
- Move the bodies verbatim first (one commit), then add `mode` gating: owner mode hides template switch, palette sidebar/brand colours, slug, site status, domains, and links back to `/dashboard/[siteId]/…` instead of `/admin/…` (pass a `basePath` prop).
- [ ] Verify admin pages still work (tsc, eslint, browser smoke by controller); commit "Extract site editors into shared components".

### Task 6: Dashboard Content + Team tabs; admin Team card

**Files:** Create `src/app/dashboard/[siteId]/content/page.tsx` (lists pages/extra pages + profile; owner only via `tabsForRole`), `content/pages/[key]/page.tsx`, `content/extra-pages/[key]/page.tsx`, `content/profile/page.tsx` (render site-editor components with `mode="owner"`); `src/app/dashboard/[siteId]/team/page.tsx` (list via GET owner route, invite staff form, remove buttons with confirm, shows "temporary password shared separately" note); modify `src/app/admin/sites/[siteId]/page.tsx` to add a "Team" card using the admin members route (invite owner/staff, list, remove).
- [ ] Verify tsc/eslint; commit "Add dashboard content and team tabs".

### Task 7: Verification (controller)

- [ ] `npm test`, tsc, eslint.
- [ ] User runs `005_site_members.sql` then `supabase/tests/005_site_members_check.sql` in the Supabase SQL editor → "ALL CHECKS PASSED".
- [ ] Browser (needs a test owner + staff account created via the admin Team card; credentials handled by the user): owner → dashboard → edit + publish a page, cannot see palette/template; staff → no Content/Team; outsider → /no-access.
