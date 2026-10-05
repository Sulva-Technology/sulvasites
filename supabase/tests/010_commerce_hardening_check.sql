-- 010_commerce_hardening_check.sql
-- Manual check for 010_commerce_hardening.sql. Paste into the Supabase SQL Editor (postgres role) AFTER
-- running 005, 006, 007 and 010. Runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid default gen_random_uuid(),
  site_id uuid default gen_random_uuid(),     -- A
  site_b_id uuid default gen_random_uuid(),   -- B
  cat_a uuid default gen_random_uuid(), cat_b uuid default gen_random_uuid(),
  prod_a uuid default gen_random_uuid(), prod_b uuid default gen_random_uuid(),
  var_a uuid default gen_random_uuid(), var_b uuid default gen_random_uuid()
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
select owner_id, 'zz-owner-' || substr(owner_id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated' from _ids;

insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-hard-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-hard-b-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids;

insert into public.product_categories (id, site_id, name, slug)
select cat_a, site_id, 'A', 'a' from _ids union all select cat_b, site_b_id, 'B', 'b' from _ids;
insert into public.products (id, site_id, category_id, name, slug, price_kobo)
select prod_a, site_id, cat_a, 'Pa', 'pa', 1000 from _ids union all select prod_b, site_b_id, cat_b, 'Pb', 'pb', 1000 from _ids;
insert into public.product_variants (id, product_id, site_id, options, stock)
select var_a, prod_a, site_id, '{"Size":"S"}'::jsonb, 5 from _ids
union all select var_b, prod_b, site_b_id, '{"Size":"S"}'::jsonb, 5 from _ids;

-- =============================================================================
-- postgres: structure
-- =============================================================================
do $$
declare
  co constant text := 'public.create_order(uuid,text,text,text,text,text,text,text,bigint,bigint,bigint,text,text,jsonb)';
  ex constant text := 'public.expire_stale_pending_orders(integer)';
begin
  -- audit table: RLS on, no policies, no client privileges
  perform zz_chk.expect_eq($q$select relrowsecurity::text from pg_class where oid = 'public.shop_audit_log'::regclass$q$, 'true', 'shop_audit_log has RLS');
  perform zz_chk.expect_eq($q$select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'shop_audit_log'$q$, '0', 'shop_audit_log has no policies');
  perform zz_chk.expect_eq($q$select (has_table_privilege('anon', 'public.shop_audit_log', 'select,insert,update,delete')
    or has_table_privilege('authenticated', 'public.shop_audit_log', 'select,insert,update,delete'))::text$q$, 'false', 'clients have no privileges on shop_audit_log');

  -- orders snapshot column
  perform zz_chk.expect_eq($q$select count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'paystack_key_ref'$q$, '1', 'orders.paystack_key_ref exists');

  -- composite FKs replaced the single-column ones
  perform zz_chk.expect_eq($q$select count(*)::text from pg_constraint where conrelid = 'public.order_items'::regclass and conname in ('order_items_product_same_site_fk','order_items_variant_same_site_fk')$q$, '2', 'order_items composite FKs exist');
  perform zz_chk.expect_eq($q$select count(*)::text from pg_constraint where conrelid = 'public.order_items'::regclass and conname in ('order_items_product_id_fkey','order_items_variant_id_fkey')$q$, '0', 'old single-column order_items FKs dropped');

  -- function ACL / definer / search_path
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'anon', co, 'execute'), 'false', 'anon cannot execute create_order');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'authenticated', co, 'execute'), 'false', 'authenticated cannot execute create_order');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'anon', ex, 'execute'), 'false', 'anon cannot execute expire_stale_pending_orders');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'authenticated', ex, 'execute'), 'false', 'authenticated cannot execute expire_stale_pending_orders');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'service_role', co, 'execute'), 'true', 'service_role can execute create_order');
    perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'service_role', ex, 'execute'), 'true', 'service_role can execute expire_stale_pending_orders');
  end if;
  perform zz_chk.expect_eq(format('select prosecdef::text from pg_proc where oid = %L::regprocedure', co), 'true', 'create_order is security definer');
  perform zz_chk.expect_eq(format('select prosecdef::text from pg_proc where oid = %L::regprocedure', ex), 'true', 'expire_stale_pending_orders is security definer');
  perform zz_chk.expect_eq(format($q$select array_to_string(proconfig, ',') from pg_proc where oid = %L::regprocedure$q$, co), 'search_path=public', 'create_order pins search_path');
end $$;

-- =============================================================================
-- create_order (postgres): atomic insert, consistency checks, same-site FKs, rollback on failure
-- =============================================================================
do $$
declare
  a uuid := (select site_id from _ids);
  pa uuid := (select prod_a from _ids);
  va uuid := (select var_a from _ids);
  pb uuid := (select prod_b from _ids);
  oid uuid;
  items jsonb;
begin
  items := jsonb_build_array(
    jsonb_build_object('product_id', pa, 'variant_id', va, 'name', 'Pa', 'variant_label', 'S',
                       'unit_price_kobo', 1000, 'quantity', 2, 'line_total_kobo', 2000));
  oid := public.create_order(a, 'ZZ-H-1', 'Ada', 'ada@example.test', '0800', 'delivery', 'Somewhere', null,
                             2000, 500, 2500, 'own_keys', '1234', items);
  perform zz_chk.expect_eq(format('select status || ''/'' || paystack_key_ref || ''/'' || total_kobo from public.orders where id = %L', oid), 'pending/1234/2500', 'create_order inserts a pending order with key ref');
  perform zz_chk.expect_eq(format('select count(*)::text from public.order_items where order_id = %L', oid), '1', 'create_order inserts the items');

  -- duplicate reference: unique_violation, no extra rows
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-1', 'A', 'a@example.test', '1', 'pickup', null, null, 2000, 0, 2000, 'platform', 'platform', %L::jsonb)$q$, a, items::text), 'duplicate reference', '23505');

  -- inconsistent numbers
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-2', 'A', 'a@example.test', '1', 'pickup', null, null, 1999, 0, 1999, 'platform', 'platform', %L::jsonb)$q$, a, items::text), 'subtotal differs from item sum', '22023');
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-3', 'A', 'a@example.test', '1', 'pickup', null, null, 2000, 0, 2001, 'platform', 'platform', %L::jsonb)$q$, a, items::text), 'total differs from subtotal + delivery', '22023');
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-4', 'A', 'a@example.test', '1', 'pickup', null, null, 2000, 0, 2000, 'platform', 'platform', '[]'::jsonb)$q$, a), 'empty items', '22023');
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-5', 'A', 'a@example.test', '1', 'pickup', null, null, 2000, 0, 2000, 'platform', 'platform', '{}'::jsonb)$q$, a), 'items not an array', '22023');

  -- item from another site: FK rejects, and the order insert rolls back with it (statement atomicity)
  perform zz_chk.expect_fail(format($q$select public.create_order(%L, 'ZZ-H-6', 'A', 'a@example.test', '1', 'pickup', null, null, 1000, 0, 1000, 'platform', 'platform',
    '[{"product_id":"%s","variant_id":null,"name":"x","variant_label":null,"unit_price_kobo":1000,"quantity":1,"line_total_kobo":1000}]'::jsonb)$q$, a, pb), 'item product from another site', '23503');
  perform zz_chk.expect_eq($q$select count(*)::text from public.orders where reference = 'ZZ-H-6'$q$, '0', 'failed create_order leaves no order behind');

  -- M7 direct: composite FK on order_items
  perform zz_chk.expect_fail(format($q$insert into public.order_items (order_id, site_id, product_id, name, unit_price_kobo, quantity, line_total_kobo) values (%L, %L, %L, 'x', 1, 1, 1)$q$, oid, a, pb), 'order_item product from another site', '23503');
  perform zz_chk.expect_fail(format($q$insert into public.order_items (order_id, site_id, variant_id, name, unit_price_kobo, quantity, line_total_kobo) values (%L, %L, %L, 'x', 1, 1, 1)$q$, oid, a, (select var_b from _ids)), 'order_item variant from another site', '23503');
  perform set_config('zz.order', oid::text, true);
end $$;

-- =============================================================================
-- Stale pending orders
-- =============================================================================
do $$
declare
  a uuid := (select site_id from _ids);
  old_pending uuid := gen_random_uuid();
  new_pending uuid := gen_random_uuid();
  old_paid uuid := gen_random_uuid();
  n integer;
begin
  insert into public.orders (id, site_id, reference, status, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo, paid_at, created_at)
  values (old_pending, a, 'ZZ-H-OP', 'pending', 'x', 'x@example.test', '1', 'pickup', 1, 1, null, now() - interval '30 hours'),
         (new_pending, a, 'ZZ-H-NP', 'pending', 'x', 'x@example.test', '1', 'pickup', 1, 1, null, now() - interval '2 hours'),
         (old_paid,    a, 'ZZ-H-PD', 'paid',    'x', 'x@example.test', '1', 'pickup', 1, 1, now(), now() - interval '30 hours');

  perform zz_chk.expect_fail('select public.expire_stale_pending_orders(0)', 'zero-hour expiry rejected', '22023');
  n := public.expire_stale_pending_orders(24);
  if n <> 1 then raise exception 'FAIL: expire_stale_pending_orders cancelled % orders, expected 1', n; end if;
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', old_pending), 'cancelled', 'old pending order cancelled');
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', new_pending), 'pending', 'recent pending order untouched');
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', old_paid), 'paid', 'old paid order untouched');
  if public.expire_stale_pending_orders(24) <> 0 then raise exception 'FAIL: expire is not idempotent'; end if;
  -- a late payment on the expired order is recorded, not lost
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'ZZ-H-OP', 1)$q$, old_pending), 'paid_after_cancel', 'late payment on expired order flagged paid_after_cancel');
end $$;

-- =============================================================================
-- M8: site_id immutable for client roles; service role / postgres unaffected
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare
  a uuid := (select site_id from _ids);
  b uuid := (select site_b_id from _ids);
  ca uuid := (select cat_a from _ids);
  va uuid := (select var_a from _ids);
begin
  perform zz_chk.expect_fail(format('update public.product_categories set site_id = %L where id = %L', b, ca), 'owner moves category to another site', '42501');
  perform zz_chk.expect_fail(format('update public.product_variants set site_id = %L where id = %L', b, va), 'owner moves variant to another site', '42501');
  -- normal edits still work
  perform zz_chk.expect_rows(format($q$update public.product_categories set name = 'A2' where id = %L$q$, ca), 1, 'owner renames own category');
  perform zz_chk.expect_rows(format('update public.product_variants set stock = 4 where id = %L', va), 1, 'owner edits own variant');
  perform zz_chk.expect_rows(format($q$update public.product_categories set site_id = %L where id = %L$q$, a, ca), 1, 'no-op site_id write (same value) is allowed');
end $$;
reset role;

-- deleting a product keeps the order item (ids set null) and does not break the order
do $$
declare oid uuid := current_setting('zz.order')::uuid;
begin
  delete from public.products where id = (select prod_a from _ids);
  perform zz_chk.expect_eq(format('select (product_id is null and variant_id is null)::text from public.order_items where order_id = %L', oid), 'true', 'deleting a product nulls item product/variant ids');
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
