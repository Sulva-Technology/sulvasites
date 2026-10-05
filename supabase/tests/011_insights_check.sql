-- 011_insights_check.sql
-- Manual RLS / grant / aggregate check for 011_insights.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid default gen_random_uuid(), staff_id uuid default gen_random_uuid(),
  outsider_id uuid default gen_random_uuid(), admin_id uuid default gen_random_uuid(),
  owner_b_id uuid default gen_random_uuid(), temp_pw_id uuid default gen_random_uuid(),
  site_id uuid default gen_random_uuid(),     -- A (owner, staff, temp_pw owner)
  site_b_id uuid default gen_random_uuid(),   -- B (owner_b)
  ord1 uuid default gen_random_uuid(), ord2 uuid default gen_random_uuid(),
  ord3 uuid default gen_random_uuid(), ord4 uuid default gen_random_uuid()
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
-- Super admin (012): the admin path here covers sites created as postgres (created_by is null).
insert into public.admin_users (user_id, is_super) select admin_id, true from _ids;

insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-ins-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-ins-b-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_id, temp_pw_id, 'owner' from _ids
union all select site_b_id, owner_b_id, 'owner' from _ids;

-- Traffic for site A (paths: / x4, /about, /menu).
-- today: v1 '/', v1 '/about', v2 '/' (google), v3 '/' (google), v3 '/menu'
-- 3 days ago: v4 '/'      10 days ago: v5 '/' (previous period for 7d)      100 days ago: v6 '/' (beyond retention)
insert into public.page_views (site_id, path, referrer_host, device, country, visitor, created_at)
select site_id, p.path, p.ref, p.dev, p.cc, p.v, p.at
from _ids, (values
  ('/',      null,         'mobile',  'NG', repeat('1', 32), now()),
  ('/about', null,         'mobile',  'NG', repeat('1', 32), now()),
  ('/',      'google.com', 'desktop', null, repeat('2', 32), now()),
  ('/',      'google.com', 'mobile',  'GH', repeat('3', 32), now()),
  ('/menu',  null,         'desktop', null, repeat('3', 32), now()),
  ('/',      null,         'tablet',  null, repeat('4', 32), now() - interval '3 days'),
  ('/',      null,         'desktop', null, repeat('5', 32), now() - interval '10 days'),
  ('/',      null,         'desktop', null, repeat('6', 32), now() - interval '100 days')
) as p(path, ref, dev, cc, v, at)
union all
select site_b_id, '/', null, 'desktop', null, repeat('7', 32), now() from _ids
union all
select site_b_id, '/b', null, 'desktop', null, repeat('8', 32), now() from _ids;

-- Shop (site A): two paid-in-window orders, one pending, one paid 40 days ago.
insert into public.orders (id, site_id, reference, status, customer_name, customer_email, customer_phone,
                           delivery_method, subtotal_kobo, delivery_kobo, total_kobo, paid_at)
select ord1, site_id, 'ZZ-INS-1-' || substr(ord1::text, 1, 8), 'paid',      'A', 'a@example.test', '08000000001', 'pickup', 1000000, 0, 1000000, now() from _ids
union all select ord2, site_id, 'ZZ-INS-2-' || substr(ord2::text, 1, 8), 'fulfilled', 'B', 'b@example.test', '08000000002', 'pickup', 250000, 0, 250000, now() from _ids
union all select ord3, site_id, 'ZZ-INS-3-' || substr(ord3::text, 1, 8), 'pending',   'C', 'c@example.test', '08000000003', 'pickup', 999999, 0, 999999, null from _ids
union all select ord4, site_id, 'ZZ-INS-4-' || substr(ord4::text, 1, 8), 'paid',      'D', 'd@example.test', '08000000004', 'pickup', 500000, 0, 500000, now() - interval '40 days' from _ids;

insert into public.order_items (order_id, site_id, name, unit_price_kobo, quantity, line_total_kobo)
select ord1, site_id, 'Shirt', 400000, 2, 800000 from _ids
union all select ord1, site_id, 'Cap',   200000, 1, 200000 from _ids
union all select ord2, site_id, 'Shirt', 250000, 1, 250000 from _ids;

-- Inbox (site A): one new enquiry, one read booking, one spam enquiry (ignored).
insert into public.inbox_messages (site_id, kind, name, email, message, status, is_spam)
select site_id, 'enquiry', 'Ada', 'ada@example.test', 'Hello', 'new',  false from _ids
union all select site_id, 'booking', 'Bo', 'bo@example.test', 'Hi', 'read', false from _ids
union all select site_id, 'enquiry', 'Spam', 'spam@example.test', 'Buy', 'new', true from _ids;

-- =============================================================================
-- postgres: structure
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count($q$select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relname = 'page_views'$q$, 1, 'RLS enabled on page_views');
  perform zz_chk.expect_count($q$select count(*) from pg_policies where schemaname = 'public' and tablename = 'page_views'$q$, 0, 'no policies on page_views');
  perform zz_chk.expect_eq($q$select has_any_column_privilege('anon', 'public.page_views', 'select,insert,update')::text$q$, 'false', 'anon has no privileges on page_views');
  perform zz_chk.expect_eq($q$select has_any_column_privilege('authenticated', 'public.page_views', 'select,insert,update')::text$q$, 'false', 'authenticated has no privileges on page_views');
  perform zz_chk.expect_eq($q$select has_function_privilege('anon', 'public.insights_overview(uuid,integer)', 'execute')::text$q$, 'false', 'anon cannot execute insights_overview');
  perform zz_chk.expect_eq($q$select has_function_privilege('authenticated', 'public.insights_overview(uuid,integer)', 'execute')::text$q$, 'true', 'authenticated can execute insights_overview');
  perform zz_chk.expect_eq($q$select has_function_privilege('authenticated', 'public.purge_page_views(integer)', 'execute')::text$q$, 'false', 'authenticated cannot purge');
  perform zz_chk.expect_eq($q$select has_function_privilege('anon', 'public.purge_page_views(integer)', 'execute')::text$q$, 'false', 'anon cannot purge');

  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, 'no-slash', 'desktop', repeat('a', 32))$q$, a), 'path must start with /', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, '/', 'watch', repeat('a', 32))$q$, a), 'device check', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, '/', 'desktop', '1.2.3.4')$q$, a), 'visitor must be a hash, not an IP', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, country, visitor) values (%L, '/', 'desktop', 'nig', repeat('a', 32))$q$, a), 'country is 2 uppercase letters', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, '/%s', 'desktop', repeat('a', 32))$q$, a, repeat('x', 200)), 'path length cap', '23514');
end $$;

-- =============================================================================
-- OWNER (site A): aggregates, no direct access
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_fail('select count(*) from public.page_views', 'owner cannot read page_views directly', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, '/', 'desktop', repeat('a', 32))$q$, a), 'owner cannot insert page_views', '42501');
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', b), 'owner cannot read site B insights', '42501');
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 15)', a), 'invalid period rejected', '22023');
  perform zz_chk.expect_fail('select public.insights_overview(null, 7)', 'null site rejected', '42501');

  -- 7 days: today (5) + 3 days ago (1)
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'views')$q$, a), '6', '7d views');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'visitors')$q$, a), '4', '7d visitors (v1,v2,v3,v4)');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'prev_views')$q$, a), '1', '7d previous-period views');
  perform zz_chk.expect_eq(format($q$select jsonb_array_length(public.insights_overview(%L, 7)->'daily')::text$q$, a), '7', '7d daily is gap-filled to 7 entries');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 30)->'totals'->>'views')$q$, a), '7', '30d views include the 10-day-old view');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 90)->'totals'->>'views')$q$, a), '7', '90d views exclude the 100-day-old view');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 90)->'totals'->>'prev_views')$q$, a), '0', '90d has no previous period (retention)');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'top_pages'->0->>'path')$q$, a), '/', 'top page');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'top_pages'->0->>'views')$q$, a), '4', 'top page views');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'top_referrers'->0->>'host')$q$, a), 'google.com', 'top referrer');
  perform zz_chk.expect_eq(format($q$select jsonb_array_length(public.insights_overview(%L, 7)->'top_referrers')::text$q$, a), '1', 'direct traffic is not a referrer');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'devices'->0->>'device')$q$, a), 'mobile', 'device split leader');
  -- shop
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'shop'->>'orders')$q$, a), '2', 'paid orders in window');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'shop'->>'revenue_kobo')$q$, a), '1250000', 'revenue kobo (paid + fulfilled)');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 90)->'shop'->>'orders')$q$, a), '3', '90d includes the 40-day-old paid order');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'shop'->'top_products'->0->>'name')$q$, a), 'Shirt', 'top product');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'shop'->'top_products'->0->>'quantity')$q$, a), '3', 'top product quantity');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'shop'->'top_products'->0->>'revenue_kobo')$q$, a), '1050000', 'top product revenue');
  -- inbox
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'inbox'->>'enquiries')$q$, a), '1', 'inbox enquiries (spam ignored)');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'inbox'->>'bookings')$q$, a), '1', 'inbox bookings');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'inbox'->>'unread')$q$, a), '1', 'inbox unread (spam ignored)');
end $$;
reset role;

-- =============================================================================
-- STAFF, OUTSIDER, OWNER B: denied on site A
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', (select site_id from _ids)), 'staff cannot read insights', '42501');
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', (select site_id from _ids)), 'outsider cannot read insights', '42501');
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_b_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', (select site_id from _ids)), 'other site owner cannot read insights', '42501');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'views')$q$, (select site_b_id from _ids)), '2', 'owner B reads own site');
end $$;
reset role;

-- =============================================================================
-- MUST-CHANGE-PASSWORD owner (007 gate)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', true))::text, true);
do $$
begin
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', (select site_id from _ids)), 'must_change_password owner denied', '42501');
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', false))::text, true);
do $$
begin
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'views')$q$, (select site_id from _ids)), '6', 'owner reads after flag cleared');
end $$;
reset role;

-- =============================================================================
-- ANON: nothing
-- =============================================================================
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
do $$
begin
  perform zz_chk.expect_fail('select count(*) from public.page_views', 'anon cannot select page_views', '42501');
  perform zz_chk.expect_fail(format('select public.insights_overview(%L, 7)', (select site_id from _ids)), 'anon cannot execute insights_overview', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN: any site
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'views')$q$, (select site_id from _ids)), '6', 'admin reads site A');
  perform zz_chk.expect_eq(format($q$select (public.insights_overview(%L, 7)->'totals'->>'views')$q$, (select site_b_id from _ids)), '2', 'admin reads site B');
  perform zz_chk.expect_fail('select public.purge_page_views()', 'admin client cannot purge', '42501');
end $$;
reset role;

-- =============================================================================
-- RETENTION (postgres runs the purge; service_role may call it)
-- =============================================================================
do $$
begin
  perform zz_chk.expect_fail('select public.purge_page_views(3)', 'purge refuses a retention below 7 days', '22023');
  perform public.purge_page_views();
  perform zz_chk.expect_count(format($q$select count(*) from public.page_views where created_at < now() - interval '90 days' and site_id = %L$q$, (select site_id from _ids)), 0, 'purge removed the 100-day-old row');
  perform zz_chk.expect_eq('select public.purge_page_views()::text', '0', 'purge is idempotent');
  perform zz_chk.expect_count(format('select count(*) from public.page_views where site_id = %L', (select site_id from _ids)), 7, 'recent rows survive purge');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_rows(format($q$insert into public.page_views (site_id, path, device, visitor) values (%L, '/', 'desktop', repeat('9', 32))$q$, (select site_id from _ids)), 1, 'service_role inserts page views');
    perform zz_chk.expect_eq('select public.purge_page_views()::text', '0', 'service_role can call purge');
    execute 'reset role';
  else
    raise notice 'SKIPPED: service_role path (role does not exist)';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
