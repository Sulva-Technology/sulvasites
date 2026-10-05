-- 009_business_data_check.sql
-- Manual RLS / grant / shape check for 009_business_data.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid default gen_random_uuid(), staff_id uuid default gen_random_uuid(),
  outsider_id uuid default gen_random_uuid(), admin_id uuid default gen_random_uuid(),
  owner_b_id uuid default gen_random_uuid(), temp_pw_id uuid default gen_random_uuid(),
  site_id uuid default gen_random_uuid(),     -- A (published; owner, staff, temp_pw staff)
  site_b_id uuid default gen_random_uuid(),   -- B (published; owner_b)
  site_d_id uuid default gen_random_uuid(),   -- D (draft; owner_b)
  site_c_id uuid default gen_random_uuid(),   -- C (cap test)
  item_a1 uuid default gen_random_uuid(), item_a2 uuid default gen_random_uuid(),
  item_b uuid default gen_random_uuid(), item_d uuid default gen_random_uuid()
);
grant select on _ids to anon, authenticated;
insert into _ids default values;

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

create function zz_chk.expect_eq(p_sql text, p_expected text, p_label text)
returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  if v is distinct from p_expected then
    raise exception 'FAIL: % (got %, expected %)', p_label, coalesce(v, 'NULL'), coalesce(p_expected, 'NULL');
  end if;
end $$;

insert into auth.users (id, email, aud, role)
select u.id, 'zz-' || u.tag || '-' || substr(u.id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated'
from _ids i, lateral (values
  (i.owner_id, 'owner'), (i.staff_id, 'staff'), (i.outsider_id, 'outsider'),
  (i.admin_id, 'admin'), (i.owner_b_id, 'ownerb'), (i.temp_pw_id, 'temppw')) as u(id, tag);
insert into public.admin_users (user_id) select admin_id from _ids;

insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-biz-a-' || substr(gen_random_uuid()::text, 1, 8), 't7', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-biz-b-' || substr(gen_random_uuid()::text, 1, 8), 't7', 'published'::public.site_status from _ids
union all
select site_d_id, 'zz-biz-d-' || substr(gen_random_uuid()::text, 1, 8), 't7', 'draft'::public.site_status from _ids
union all
select site_c_id, 'zz-biz-c-' || substr(gen_random_uuid()::text, 1, 8), 't7', 'draft'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_id, temp_pw_id, 'staff' from _ids
union all select site_b_id, owner_b_id, 'owner' from _ids
union all select site_d_id, owner_b_id, 'owner' from _ids;

insert into public.business_items (id, site_id, kind, position, name, price_kobo, data, active)
select item_a1, site_id, 'menu_item', 0, 'Jollof rice', 350000,
       '{"category":"Mains","description":"Smoky party jollof","dietary":["halal","spicy"],"photo":"https://example.test/a.jpg"}'::jsonb, true from _ids
union all select item_a2, site_id, 'menu_item', 1, 'Sold out soup', 500000, '{}'::jsonb, false from _ids
union all select item_b, site_b_id, 'menu_item', 0, 'B dish', 100000, '{}'::jsonb, true from _ids
union all select item_d, site_d_id, 'menu_item', 0, 'Draft dish', 100000, '{}'::jsonb, true from _ids;

-- =============================================================================
-- postgres: structural facts + shape CHECKs
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count($q$select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relname = 'business_items'$q$, 1, 'RLS enabled on business_items');
  perform zz_chk.expect_eq($q$select has_table_privilege('anon', 'public.business_items', 'select')::text$q$, 'true', 'anon can select (RLS limits rows)');
  perform zz_chk.expect_eq($q$select has_table_privilege('anon', 'public.business_items', 'insert,update,delete')::text$q$, 'false', 'anon cannot write');
  perform zz_chk.expect_eq($q$select data_type from information_schema.columns where table_schema='public' and table_name='business_items' and column_name='price_kobo'$q$, 'bigint', 'price_kobo is bigint');

  -- valid rows of every kind
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, price_kobo, data) values (%L, 'timetable_slot', 'Spin', null, '{"day":"mon","start":"06:00","end":"07:00","instructor":"Tolu"}')$q$, a), 1, 'valid timetable slot');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, price_kobo, data) values (%L, 'doctor', 'Dr Ada', 1500000, '{"specialty":"Dentist","bio":"Hi"}')$q$, a), 1, 'valid doctor');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'service', 'Scaling', '{"duration":"30 min"}')$q$, a), 1, 'valid service');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, price_kobo, data) values (%L, 'programme', 'BSc', 25000000, '{"duration":"4 years"}')$q$, a), 1, 'valid programme');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'package', 'Gold', '{"duration":"1 day"}')$q$, a), 1, 'valid package');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'project', 'Estate', '{"status":"ongoing","photos":["https://example.test/p.jpg"]}')$q$, a), 1, 'valid project');

  -- invalid shapes
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'bogus', 'x')$q$, a), 'unknown kind', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '{"day":"mon"}')$q$, a), 'key not allowed for kind', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '[1]')$q$, a), 'data must be an object', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '{"description":5}')$q$, a), 'description must be string', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', jsonb_build_object('description', repeat('a', 501)))$q$, a), 'description length cap', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '{"photo":"javascript:alert(1)"}')$q$, a), 'photo must be https', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '{"photo":"http://example.test/a.jpg"}')$q$, a), 'photo http rejected', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'menu_item', 'x', '{"dietary":["pork"]}')$q$, a), 'dietary enum', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'timetable_slot', 'x', '{"day":"funday"}')$q$, a), 'day enum', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'timetable_slot', 'x', '{"start":"25:00"}')$q$, a), 'time format', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'timetable_slot', 'x', '{"start":"09:00","end":"08:00"}')$q$, a), 'end must be after start', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, price_kobo) values (%L, 'timetable_slot', 'x', 100)$q$, a), 'timetable has no price', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'project', 'x', '{"status":"done"}')$q$, a), 'project status enum', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, data) values (%L, 'project', 'x', '{"photos":["https://e.test/1","https://e.test/2","https://e.test/3","https://e.test/4","https://e.test/5","https://e.test/6","https://e.test/7"]}')$q$, a), 'photos max 6', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, price_kobo) values (%L, 'service', 'x', -1)$q$, a), 'price not negative', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name, price_kobo) values (%L, 'service', 'x', 1000000000001)$q$, a), 'price upper bound', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'service', '   ')$q$, a), 'name must not be blank', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'service', repeat('a', 121))$q$, a), 'name length cap', '23514');
end $$;

-- cap: 500 items per site
insert into public.business_items (site_id, kind, name)
select (select site_c_id from _ids), 'service', 'S' || g from generate_series(1, 500) g;
select zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'service', 'one too many')$q$, (select site_c_id from _ids)), '501st item rejected', '54000');

-- =============================================================================
-- OWNER (site A): full read + write on A, nothing on B
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_count(format($q$select count(*) from public.business_items where site_id = %L and kind = 'menu_item'$q$, a), 2, 'owner reads active + inactive on A');
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L', b), 1, 'owner sees B active item only via public policy');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name, price_kobo, data) values (%L, 'menu_item', 'Suya', 200000, '{"dietary":["halal"]}')$q$, a), 1, 'owner inserts');
  perform zz_chk.expect_rows(format($q$update public.business_items set price_kobo = 400000, active = false where id = %L$q$, (select item_a1 from _ids)), 1, 'owner updates price + availability');
  perform zz_chk.expect_rows(format($q$update public.business_items set position = 7 where id = %L$q$, (select item_a1 from _ids)), 1, 'owner reorders');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'x')$q$, b), 'owner cannot insert on B', '42501');
  perform zz_chk.expect_fail(format($q$update public.business_items set site_id = %L where id = %L$q$, b, (select item_a1 from _ids)), 'owner cannot move item to B', '42501');
  perform zz_chk.expect_fail(format($q$update public.business_items set kind = 'doctor' where id = %L$q$, (select item_a1 from _ids)), 'owner cannot change kind', '42501');
  perform zz_chk.expect_fail(format($q$update public.business_items set data = '{"day":"mon"}' where id = %L$q$, (select item_a1 from _ids)), 'owner cannot break shape', '23514');
  perform zz_chk.expect_rows(format($q$update public.business_items set name = 'hax' where id = %L$q$, (select item_b from _ids)), 0, 'owner cannot update B item');
  perform zz_chk.expect_rows(format($q$delete from public.business_items where id = %L$q$, (select item_b from _ids)), 0, 'owner cannot delete B item');
  perform zz_chk.expect_rows(format($q$delete from public.business_items where id = %L$q$, (select item_a2 from _ids)), 1, 'owner deletes own item');
end $$;
reset role;

-- =============================================================================
-- STAFF (site A): same write access (owner-accounts spec: staff run the business tabs)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'Staff dish')$q$, a), 1, 'staff inserts');
  perform zz_chk.expect_rows(format($q$update public.business_items set active = true where id = %L$q$, (select item_a1 from _ids)), 1, 'staff toggles availability');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'x')$q$, b), 'staff cannot insert on B', '42501');
end $$;
reset role;

-- =============================================================================
-- OUTSIDER: only the public view (active items of published sites)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L and not active', a), 0, 'outsider cannot see inactive items');
  perform zz_chk.expect_rows(format($q$update public.business_items set name = 'x' where site_id = %L$q$, a), 0, 'outsider updates nothing');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'x')$q$, a), 'outsider cannot insert', '42501');
  perform zz_chk.expect_rows(format($q$delete from public.business_items where site_id = %L$q$, a), 0, 'outsider deletes nothing');
end $$;
reset role;

-- =============================================================================
-- MUST-CHANGE-PASSWORD member (007 gate): no member powers until the flag is cleared
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', true))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L and not active', a), 0, 'temp-password member cannot see inactive items');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'x')$q$, a), 'temp-password member cannot insert', '42501');
  perform zz_chk.expect_rows(format($q$update public.business_items set name = 'x' where site_id = %L$q$, a), 0, 'temp-password member cannot update');
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', false))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'After change')$q$, a), 1, 'member inserts after flag cleared');
end $$;
reset role;

-- =============================================================================
-- ANON: only active items of PUBLISHED sites, never write
-- =============================================================================
update public.business_items set active = false where id = (select item_a1 from _ids);
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids); d uuid := (select site_d_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L and not active', a), 0, 'anon cannot see inactive items');
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L', b), 1, 'anon sees active items of a published site');
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L', d), 0, 'anon cannot see items of a draft site');
  perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'menu_item', 'x')$q$, a), 'anon cannot insert', '42501');
  perform zz_chk.expect_fail(format($q$update public.business_items set name = 'x' where site_id = %L$q$, a), 'anon cannot update', '42501');
  perform zz_chk.expect_fail(format($q$delete from public.business_items where site_id = %L$q$, a), 'anon cannot delete', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN: everything
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare d uuid := (select site_d_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.business_items where site_id = %L', d), 1, 'admin sees draft site items');
  perform zz_chk.expect_rows(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'service', 'Admin added')$q$, d), 1, 'admin inserts anywhere');
  perform zz_chk.expect_rows(format($q$delete from public.business_items where id = %L$q$, (select item_d from _ids)), 1, 'admin deletes anywhere');
end $$;
reset role;

-- =============================================================================
-- SERVICE ROLE: passes the immutability guard (ops), cap still applies
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids); ib uuid := (select item_b from _ids); c uuid := (select site_c_id from _ids);
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_rows(format($q$update public.business_items set site_id = %L where id = %L$q$, a, ib), 1, 'service_role may move an item (ops)');
    perform zz_chk.expect_fail(format($q$insert into public.business_items (site_id, kind, name) values (%L, 'service', 'cap')$q$, c), 'cap applies to service_role', '54000');
    execute 'reset role';
  else
    raise notice 'SKIPPED: service_role path (role does not exist)';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
