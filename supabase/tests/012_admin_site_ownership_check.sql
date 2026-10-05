-- 012_admin_site_ownership_check.sql
-- Manual RLS check for 012_admin_site_ownership.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  super_id uuid, admin_a_id uuid, admin_b_id uuid, owner_b_id uuid,
  site_a uuid, site_b uuid, site_b_live uuid, site_legacy uuid
);
grant select on _ids to authenticated;

insert into _ids
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

create schema zz_chk;
grant usage on schema zz_chk to public;

create function zz_chk.expect_fail(p_sql text, p_label text, p_state text default null)
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
end $$;

create function zz_chk.expect_rows(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_n then raise exception 'FAIL: % (affected % rows, expected %)', p_label, n, p_n; end if;
end $$;

create function zz_chk.expect_count(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql into n;
  if n <> p_n then raise exception 'FAIL: % (count %, expected %)', p_label, n, p_n; end if;
end $$;

create function zz_chk.expect_true(p_sql text, p_want boolean, p_label text)
returns void language plpgsql as $$
declare got boolean;
begin
  execute p_sql into got;
  got := coalesce(got, false);  -- RLS treats null as deny
  if got is distinct from p_want then raise exception 'FAIL: % (got %, expected %)', p_label, got, p_want; end if;
end $$;

insert into auth.users (id, email, aud, role)
select u.id, 'zz-' || u.tag || '-' || substr(u.id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated'
from _ids i, lateral (values
  (i.super_id, 'super'), (i.admin_a_id, 'admina'), (i.admin_b_id, 'adminb'), (i.owner_b_id, 'ownerb')) as u(id, tag);

insert into public.admin_users (user_id, is_super)
select super_id, true from _ids
union all select admin_a_id, false from _ids
union all select admin_b_id, false from _ids;

-- As postgres: B's sites belong to admin B; the legacy site has no creator (pre-012 site).
insert into public.sites (id, slug, template_key, created_by)
select site_b,      'zz-own-b-'      || substr(gen_random_uuid()::text, 1, 8), 't1', admin_b_id from _ids
union all
select site_b_live, 'zz-own-b-live-' || substr(gen_random_uuid()::text, 1, 8), 't1', admin_b_id from _ids
union all
select site_legacy, 'zz-own-legacy-' || substr(gen_random_uuid()::text, 1, 8), 't1', null from _ids;
update public.sites set status = 'published' where id = (select site_b_live from _ids);
update public.pages set status = 'published', published_at = now() where site_id = (select site_b_live from _ids);
insert into public.site_members (site_id, user_id, role) select site_b, owner_b_id, 'owner' from _ids;

-- =============================================================================
-- ADMIN A (regular admin)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_a_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  me uuid := (select admin_a_id from _ids);
  other uuid := (select admin_b_id from _ids);
  a uuid := (select site_a from _ids);
  b uuid := (select site_b from _ids);
  bl uuid := (select site_b_live from _ids);
  legacy uuid := (select site_legacy from _ids);
begin
  -- Creating a site stamps the caller as creator, even if another creator is supplied.
  perform zz_chk.expect_rows(format($q$insert into public.sites (id, slug, template_key, created_by)
    values (%L, 'zz-own-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', %L) returning id$q$, a, other), 1, 'admin A creates a site (insert ... returning)');
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L and created_by = %L', a, me), 1, 'new site is stamped with admin A');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', a), 3, 'admin A reads seeded pages of own site');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":1}'::jsonb where site_id = %L and key = 'home'$q$, a), 1, 'admin A edits own page');
  perform zz_chk.expect_rows(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-a')$q$, a), 1, 'admin A adds extra page to own site');
  perform zz_chk.expect_true(format('select public.is_site_admin(%L)', a), true, 'is_site_admin(own site)');
  perform zz_chk.expect_true(format('select public.can_edit_site(%L)', a), true, 'can_edit_site(own site)');
  perform zz_chk.expect_fail(format('update public.sites set created_by = %L where id = %L', other, a), 'admin A hands own site to another admin', '42501');

  -- Admin B's draft site: invisible and untouchable.
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', b), 0, 'admin A cannot see admin B draft site');
  perform zz_chk.expect_count(format('select count(*) from public.pages where site_id = %L', b), 0, 'admin A cannot see admin B draft pages');
  perform zz_chk.expect_count(format('select count(*) from public.business_profiles where site_id = %L', b), 0, 'admin A cannot see admin B profile');
  perform zz_chk.expect_count(format('select count(*) from public.site_members where site_id = %L', b), 0, 'admin A cannot see admin B team');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":1}'::jsonb where site_id = %L$q$, b), 0, 'admin A cannot edit admin B pages');
  perform zz_chk.expect_rows(format($q$update public.sites set status = 'published' where id = %L$q$, b), 0, 'admin A cannot publish admin B site');
  perform zz_chk.expect_rows(format('delete from public.sites where id = %L', b), 0, 'admin A cannot delete admin B site');
  perform zz_chk.expect_fail(format($q$insert into public.extra_pages (site_id, key) values (%L, 'zz-x')$q$, b), 'admin A cannot add extra page to admin B site', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.domains (site_id, hostname) values (%L, 'zz-x.example.test')$q$, b), 'admin A cannot add domain to admin B site', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.site_members (site_id, user_id, role) values (%L, %L, 'owner')$q$, b, me), 'admin A cannot join admin B site', '42501');
  perform zz_chk.expect_fail(format($q$insert into storage.objects (bucket_id, name) values ('site-assets', %L)$q$, b::text || '/logo/x.png'), 'admin A cannot upload into admin B site', '42501');
  perform zz_chk.expect_rows(format($q$insert into storage.objects (bucket_id, name) values ('site-assets', %L)$q$, a::text || '/logo/x.png'), 1, 'admin A uploads into own site');
  perform zz_chk.expect_true(format('select public.is_site_admin(%L)', b), false, 'is_site_admin(admin B site)');
  perform zz_chk.expect_true(format('select public.can_edit_site(%L)', b), false, 'can_edit_site(admin B site)');
  perform zz_chk.expect_true(format('select public.is_site_member(%L)', b), false, 'is_site_member(admin B site)');

  -- Admin B's live site: public content stays public, but admin A cannot change anything.
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', bl), 1, 'live site is publicly readable');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":1}'::jsonb where site_id = %L$q$, bl), 0, 'admin A cannot edit admin B live pages');
  perform zz_chk.expect_rows(format($q$update public.sites set status = 'draft' where id = %L$q$, bl), 0, 'admin A cannot unpublish admin B live site');

  -- Legacy site (no creator): super admins only.
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', legacy), 0, 'admin A cannot see legacy site');
  perform zz_chk.expect_true(format('select public.is_site_admin(%L)', legacy), false, 'is_site_admin(legacy site)');

  -- Admin management is super-admin only.
  perform zz_chk.expect_true('select public.is_super_admin()', false, 'admin A is not super');
  perform zz_chk.expect_count('select count(*) from public.admin_users', 1, 'admin A sees only own admin row');
  perform zz_chk.expect_fail(format('insert into public.admin_users (user_id) values (%L)', (select owner_b_id from _ids)), 'admin A cannot add an admin', '42501');
  perform zz_chk.expect_rows(format('delete from public.admin_users where user_id = %L', other), 0, 'admin A cannot remove an admin');
  perform zz_chk.expect_rows(format('update public.admin_users set is_super = true where user_id = %L', me), 0, 'admin A cannot make self super');
end $$;

reset role;

-- =============================================================================
-- OWNER of admin B's site: unaffected by admin ownership
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_b_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare b uuid := (select site_b from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.sites where id = %L', b), 1, 'owner reads own site');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":2}'::jsonb where site_id = %L and key = 'home'$q$, b), 1, 'owner edits own page');
  perform zz_chk.expect_fail(format('update public.sites set created_by = null where id = %L', b), 'owner cannot reassign site', '42501');
end $$;

reset role;

-- =============================================================================
-- SUPER ADMIN
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select super_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_a from _ids);
  b uuid := (select site_b from _ids);
  legacy uuid := (select site_legacy from _ids);
  admin_b uuid := (select admin_b_id from _ids);
begin
  perform zz_chk.expect_true('select public.is_super_admin()', true, 'super is super');
  perform zz_chk.expect_count(format('select count(*) from public.sites where id in (%L, %L, %L)', a, b, legacy), 3, 'super sees every site, legacy included');
  perform zz_chk.expect_rows(format($q$update public.pages set data = '{"zz":3}'::jsonb where site_id = %L and key = 'home'$q$, b), 1, 'super edits admin B page');
  perform zz_chk.expect_rows(format('update public.sites set created_by = %L where id = %L', admin_b, legacy), 1, 'super hands legacy site to admin B');
  perform zz_chk.expect_count('select count(*) from public.admin_users where user_id in (select admin_a_id from _ids union all select admin_b_id from _ids)', 2, 'super sees all admins');
  perform zz_chk.expect_rows(format('insert into public.admin_users (user_id) values (%L)', (select owner_b_id from _ids)), 1, 'super adds an admin');
  perform zz_chk.expect_rows(format('delete from public.admin_users where user_id = %L', (select owner_b_id from _ids)), 1, 'super removes an admin');
end $$;

reset role;

-- Legacy site now belongs to admin B: admin B sees it.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_b_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_count('select count(*) from public.sites where id = (select site_legacy from _ids)', 1, 'admin B sees reassigned legacy site');
  perform zz_chk.expect_count('select count(*) from public.sites where id = (select site_a from _ids)', 0, 'admin B cannot see admin A site');
end $$;
reset role;

-- Last super admin cannot be removed (checked only when the temp super is the only one).
do $$
begin
  if (select count(*) from public.admin_users where is_super) = 1 then
    perform zz_chk.expect_fail('update public.admin_users set is_super = false where user_id = (select super_id from _ids)', 'demote last super admin', '42501');
    perform zz_chk.expect_fail('delete from public.admin_users where user_id = (select super_id from _ids)', 'delete last super admin', '42501');
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
