-- 005_site_members_check.sql
-- Manual RLS check for 005_site_members.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid, staff_id uuid, outsider_id uuid, admin_id uuid, owner_b_id uuid,
  site_id uuid, site_b_id uuid
);
grant select on _ids to authenticated;

insert into _ids
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid());

create schema zz_chk;
grant usage on schema zz_chk to public;

-- Helpers (run as the invoking role, so RLS / guards apply to the dynamic SQL).
-- expect_fail: the statement must raise. p_state = expected SQLSTATE (null = any),
-- p_msg = expected message (null = any). A FAIL raised here is outside the catching block.
create function zz_chk.expect_fail(p_sql text, p_label text, p_state text default null, p_msg text default null)
returns void language plpgsql as $$
declare ok boolean := false; got_state text; got_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    ok := true; got_state := sqlstate; got_msg := sqlerrm;
  end;
  if not ok then raise exception 'FAIL: % (statement succeeded, expected error)', p_label; end if;
  if p_state is not null and got_state <> p_state then
    raise exception 'FAIL: % (sqlstate %, expected %: %)', p_label, got_state, p_state, got_msg;
  end if;
  if p_msg is not null and got_msg <> p_msg then
    raise exception 'FAIL: % (message "%", expected "%")', p_label, got_msg, p_msg;
  end if;
end $$;

-- expect_rows: the statement must succeed and affect exactly p_n rows.
create function zz_chk.expect_rows(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_n then raise exception 'FAIL: % (affected % rows, expected %)', p_label, n, p_n; end if;
end $$;

-- expect_count: select count(*) query must return p_n.
create function zz_chk.expect_count(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql into n;
  if n <> p_n then raise exception 'FAIL: % (count %, expected %)', p_label, n, p_n; end if;
end $$;

insert into auth.users (id, email, aud, role)
select u.id, 'zz-' || u.tag || '-' || substr(u.id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated'
from _ids i, lateral (values
  (i.owner_id, 'owner'), (i.staff_id, 'staff'), (i.outsider_id, 'outsider'),
  (i.admin_id, 'admin'), (i.owner_b_id, 'ownerb')) as u(id, tag);

-- Temp admin so the admin path is always exercised (rolled back with everything else).
insert into public.admin_users (user_id) select admin_id from _ids;

-- handle_new_site trigger auto-creates business_profiles + home/about/contact pages.
insert into public.sites (id, slug, template_key)
select site_id,   'zz-rls-check-a-' || substr(gen_random_uuid()::text, 1, 8), 't1' from _ids
union all
select site_b_id, 'zz-rls-check-b-' || substr(gen_random_uuid()::text, 1, 8), 't1' from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_b_id, owner_b_id, 'owner' from _ids;

insert into public.extra_pages (site_id, key) select site_b_id, 'zz-b-extra' from _ids;
insert into public.domains (site_id, hostname, status)
select site_id, 'zz-' || substr(site_id::text, 1, 8) || '.example.test', 'active' from _ids;

-- Sanity: seed rows exist (as postgres).
do $$
begin
  perform zz_chk.expect_count('select count(*) from public.pages where site_id = (select site_id from _ids)', 3, 'setup: 3 pages for site A');
  perform zz_chk.expect_count('select count(*) from public.business_profiles where site_id = (select site_id from _ids)', 1, 'setup: profile for site A');
  perform zz_chk.expect_count('select count(*) from public.pages where site_id = (select site_b_id from _ids)', 3, 'setup: 3 pages for site B');
end $$;

-- =============================================================================
-- OWNER (of site A)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  b uuid := (select site_b_id from _ids);
  staff uuid := (select staff_id from _ids);
  own uuid := (select owner_id from _ids);
  guard constant text := 'Only Sulvatech can change this setting.';
begin
  -- reads / allowed writes on own site
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 1, 'owner reads own site');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":1}'::jsonb where site_id = %L and key = 'home'$q$, a), 1, 'owner page update');
  perform zz_chk.expect_rows(format($q$update public.business_profiles set business_name = 'ZZ Owner Edit' where site_id = %L$q$, a), 1, 'owner profile business_name update');
  perform zz_chk.expect_rows(format($q$update public.pages set status = 'published', published_at = now() where site_id = %L and key = 'home'$q$, a), 1, 'owner publishes a page');
  perform zz_chk.expect_rows(format($q$update public.pages set status = 'draft', published_at = null where site_id = %L and key = 'home'$q$, a), 1, 'owner unpublishes a page (restore draft)');

  -- extra_pages: full write on own site
  perform zz_chk.expect_rows(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-extra')$q$, a), 1, 'owner inserts extra_page');
  perform zz_chk.expect_rows(format($q$update public.extra_pages set data = '{"zz":1}'::jsonb where site_id = %L and key = 'zz-extra'$q$, a), 1, 'owner updates extra_page');
  perform zz_chk.expect_rows(format($q$delete from public.extra_pages where site_id = %L and key = 'zz-extra'$q$, a), 1, 'owner deletes extra_page');

  -- Sulvatech-only fields
  perform zz_chk.expect_fail(format($q$update public.sites set slug = slug || '-x' where id = %L$q$, a), 'owner changes sites.slug', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.sites set status = 'published' where id = %L$q$, a), 'owner changes sites.status', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.sites set template_key = 't2' where id = %L$q$, a), 'owner changes sites.template_key', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.business_profiles set theme_colors = '{"primary":"#000"}'::jsonb where site_id = %L$q$, a), 'owner changes theme_colors', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.business_profiles set brand_colors = '{"primary":"#000"}'::jsonb where site_id = %L$q$, a), 'owner changes brand_colors', '42501', guard);

  -- profile delete + re-insert bypass is closed
  perform zz_chk.expect_rows(format('delete from public.business_profiles where site_id = %L', a), 0, 'owner delete of own profile is denied (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.business_profiles (site_id, business_name, theme_colors) values (%L, 'x', '{"primary":"#000"}'::jsonb)$q$, a), 'owner inserts profile with theme_colors', '42501');
  -- core pages cannot be deleted
  perform zz_chk.expect_rows(format('delete from public.pages where site_id = %L', a), 0, 'owner delete of core pages is denied (0 rows)');

  -- sites / domains: no insert, no delete, no domain writes
  perform zz_chk.expect_fail($q$insert into public.sites (slug, template_key) values ('zz-owner-new', 't1')$q$, 'owner inserts site', '42501');
  perform zz_chk.expect_rows(format('delete from public.sites where id = %L', a), 0, 'owner delete of site is denied (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.domains (site_id, hostname) values (%L, 'zz-owner.example.test')$q$, a), 'owner inserts domain', '42501');
  perform zz_chk.expect_rows(format($q$update public.domains set status = 'blocked' where site_id = %L$q$, a), 0, 'owner domain update is denied (0 rows)');
  perform zz_chk.expect_rows(format('delete from public.domains where site_id = %L', a), 0, 'owner domain delete is denied (0 rows)');

  -- membership tampering
  perform zz_chk.expect_fail(format($q$insert into public.site_members (site_id, user_id, role) values (%L, %L, 'owner')$q$, b, own), 'owner self-adds to site B', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.site_members (site_id, user_id, role) values (%L, %L, 'owner')$q$, a, (select outsider_id from _ids)), 'owner adds member directly (server route only)', '42501');
  perform zz_chk.expect_rows(format($q$update public.site_members set role = 'owner' where user_id = %L$q$, staff), 0, 'owner promotes staff directly (0 rows)');
  perform zz_chk.expect_rows(format('delete from public.site_members where site_id = %L and user_id = %L', a, staff), 0, 'owner deletes staff directly (0 rows)');

  -- cross-site: cannot read, cannot move rows, cannot write
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', b), 0, 'owner cannot read site B');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', b), 0, 'owner cannot read site B pages');
  perform zz_chk.expect_count(format('select count(*) from public.business_profiles where site_id = %L', b), 0, 'owner cannot read site B profile');
  perform zz_chk.expect_count(format('select count(*) from public.extra_pages where site_id = %L', b), 0, 'owner cannot read site B extra_pages');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', b), 0, 'owner cannot read site B members');
  perform zz_chk.expect_fail(format($q$update public.pages set site_id = %L where site_id = %L and key = 'home'$q$, b, a), 'owner moves page to site B', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-x')$q$, b), 'owner inserts extra_page on site B', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.assets (site_id, path) values (%L, 'zz/x.png')$q$, b), 'owner inserts asset on site B', '42501');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":9}'::jsonb where site_id = %L$q$, b), 0, 'owner updates site B pages (0 rows)');

  -- assets on own site
  perform zz_chk.expect_rows(format($q$insert into public.assets (site_id, path) values (%L, 'zz/own.png')$q$, a), 1, 'owner inserts asset on own site');

  -- storage (bucket site-assets from migration 004)
  perform zz_chk.expect_rows(format($q$insert into storage.objects (bucket_id, name) values ('site-assets', %L)$q$, a::text || '/a.png'), 1, 'owner storage write under own site prefix');
  perform zz_chk.expect_fail(format($q$insert into storage.objects (bucket_id, name) values ('site-assets', %L)$q$, b::text || '/a.png'), 'owner storage write under site B prefix', '42501');
  perform zz_chk.expect_fail($q$insert into storage.objects (bucket_id, name) values ('site-assets', 'not-a-uuid/a.png')$q$, 'owner storage write under non-uuid prefix (RLS error, not cast error)', '42501');
end $$;
reset role;

-- =============================================================================
-- STAFF
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  staff uuid := (select staff_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 1, 'staff reads site');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', a), 3, 'staff reads pages');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', a), 2, 'staff reads team');

  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":2}'::jsonb where site_id = %L and key = 'home'$q$, a), 0, 'staff page update (0 rows)');
  perform zz_chk.expect_rows(format($q$update public.business_profiles set business_name = 'ZZ Staff Edit' where site_id = %L$q$, a), 0, 'staff profile update (0 rows)');
  perform zz_chk.expect_rows(format('update public.sites set updated_at = now() where id = %L', a), 0, 'staff site update (0 rows)');
  perform zz_chk.expect_rows(format($q$update public.site_members set role = 'owner' where user_id = %L$q$, staff), 0, 'staff self-promotion (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.site_members (site_id, user_id, role) values (%L, %L, 'owner')$q$, a, (select outsider_id from _ids)), 'staff adds member', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-staff')$q$, a), 'staff inserts extra_page', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.assets (site_id, path) values (%L, 'zz/staff.png')$q$, a), 'staff inserts asset', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.domains (site_id, hostname) values (%L, 'zz-staff.example.test')$q$, a), 'staff inserts domain', '42501');
  perform zz_chk.expect_rows(format($q$update public.domains set status = 'blocked' where site_id = %L$q$, a), 0, 'staff domain update (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into storage.objects (bucket_id, name) values ('site-assets', %L)$q$, a::text || '/staff.png'), 'staff storage write', '42501');
end $$;
reset role;

-- =============================================================================
-- OUTSIDER (authenticated, not a member; both sites are draft so public read does not apply)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 0, 'outsider reads site');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', a), 0, 'outsider reads pages');
  perform zz_chk.expect_count(format('select count(*) from public.business_profiles where site_id = %L', a), 0, 'outsider reads profile');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', a), 0, 'outsider reads members');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":3}'::jsonb where site_id = %L$q$, a), 0, 'outsider page update (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.site_members (site_id, user_id, role) values (%L, %L, 'owner')$q$, a, (select outsider_id from _ids)), 'outsider self-adds', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN (temp admin created above): full access, guards do not block
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 1, 'admin reads site');
  perform zz_chk.expect_rows(format($q$update public.sites set slug = slug || '-adm' where id = %L$q$, a), 1, 'admin changes slug');
  perform zz_chk.expect_rows(format($q$update public.sites set template_key = 't2' where id = %L$q$, a), 1, 'admin changes template_key');
  perform zz_chk.expect_rows(format($q$update public.business_profiles set theme_colors = '{"primary":"#111"}'::jsonb where site_id = %L$q$, a), 1, 'admin changes theme_colors');
  perform zz_chk.expect_rows(format($q$update public.business_profiles set brand_colors = '{"primary":"#111"}'::jsonb where site_id = %L$q$, a), 1, 'admin changes brand_colors');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', a), 2, 'admin reads members');
end $$;
reset role;

-- =============================================================================
-- postgres / service_role passthrough: guards must not block server and ops writes
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_rows(format($q$update public.sites set status = 'published' where id = %L$q$, a), 1, 'postgres changes sites.status (guard passthrough)');
  perform zz_chk.expect_rows(format($q$update public.business_profiles set theme_colors = '{"primary":"#222"}'::jsonb where site_id = %L$q$, a), 1, 'postgres changes theme_colors (guard passthrough)');

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_rows(format($q$update public.sites set status = 'suspended' where id = %L$q$, a), 1, 'service_role changes sites.status (guard passthrough)');
    perform zz_chk.expect_rows(format($q$update public.business_profiles set brand_colors = '{"primary":"#333"}'::jsonb where site_id = %L$q$, a), 1, 'service_role changes brand_colors (guard passthrough)');
    execute 'reset role';
  else
    raise notice 'SKIPPED: service_role path (role does not exist)';
  end if;
end $$;

-- =============================================================================
-- MUST_CHANGE_PASSWORD GATE (migration 007): flag true in the JWT blocks member access
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated',
                    'app_metadata', json_build_object('must_change_password', true))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 0, 'flagged owner cannot read site');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', a), 0, 'flagged owner cannot read pages');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', a), 0, 'flagged owner cannot read members');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":5}'::jsonb where site_id = %L and key = 'home'$q$, a), 0, 'flagged owner page update (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-flag')$q$, a), 'flagged owner inserts extra_page', '42501');
  perform zz_chk.expect_count(format('select count(*) from (select public.site_role(%L) as r) x where r is not null', a), 0, 'flagged owner site_role is null');
end $$;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated',
                    'app_metadata', json_build_object('must_change_password', false))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', a), 1, 'unflagged (false) owner reads site');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":6}'::jsonb where site_id = %L and key = 'home'$q$, a), 1, 'unflagged (false) owner page update');
end $$;
-- flagged admin is unaffected
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated',
                    'app_metadata', json_build_object('must_change_password', true))::text, true);
do $$
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', (select site_id from _ids)), 1, 'flagged admin still reads site (is_admin path)');
end $$;
reset role;

-- =============================================================================
-- LAST-OWNER GUARD (migration 007), as postgres and service_role
-- =============================================================================
do $$
declare
  a uuid := (select site_id from _ids);
  own uuid := (select owner_id from _ids);
begin
  perform zz_chk.expect_fail(format('delete from public.site_members where site_id = %L and user_id = %L', a, own), 'postgres deletes last owner', 'SM001');
  perform zz_chk.expect_fail(format($q$update public.site_members set role = 'staff' where site_id = %L and user_id = %L$q$, a, own), 'postgres demotes last owner', 'SM001');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_fail(format('delete from public.site_members where site_id = %L and user_id = %L', a, own), 'service_role deletes last owner', 'SM001');
    execute 'reset role';
  end if;
  -- with a second owner, removal works
  insert into public.site_members (site_id, user_id, role) values (a, (select outsider_id from _ids), 'owner');
  perform zz_chk.expect_rows(format('delete from public.site_members where site_id = %L and user_id = %L', a, own), 1, 'delete owner when another owner exists');
  -- staff removal always fine
  perform zz_chk.expect_rows(format('delete from public.site_members where site_id = %L and user_id = %L', a, (select staff_id from _ids)), 1, 'delete staff');
  -- site deletion cascades past the guard
  perform zz_chk.expect_rows(format('delete from public.sites where id = %L', a), 1, 'site delete cascades through last-owner guard');
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
