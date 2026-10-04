-- 006_commerce_check.sql
-- Manual RLS / function check for 006_commerce.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid, staff_id uuid, outsider_id uuid, admin_id uuid, owner_b_id uuid,
  site_id uuid, site_b_id uuid,
  cat_a uuid, cat_b uuid,
  prod_a uuid, prod_a_off uuid, prod_b uuid,
  var_a1 uuid, var_a2 uuid, var_a3 uuid, var_a_off uuid, var_b uuid,
  order_a uuid, order_a_mm uuid, order_a_st uuid, order_b uuid
);
grant select on _ids to anon, authenticated;

insert into _ids
select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid();

create schema zz_chk;
grant usage on schema zz_chk to public;

-- Helpers (run as the invoking role, so RLS / guards / grants apply to the dynamic SQL).
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

-- expect_eq: single-value query (cast to text) must equal p_expected (null-safe).
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
  (i.admin_id, 'admin'), (i.owner_b_id, 'ownerb')) as u(id, tag);

-- Temp admin so the admin path is always exercised (rolled back with everything else).
insert into public.admin_users (user_id) select admin_id from _ids;

-- Site A is PUBLISHED, site B is DRAFT.
insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-shop-check-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-shop-check-b-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'draft'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_b_id, owner_b_id, 'owner' from _ids;

insert into public.shop_settings (site_id, enabled, delivery_fee_kobo)
select site_id, true, 150000 from _ids
union all select site_b_id, true, 0 from _ids;

insert into public.shop_payment_secrets (site_id, subaccount_code, account_last4)
select site_id, 'ACCT_zzcheck', '1234' from _ids;

insert into public.product_categories (id, site_id, name, slug)
select cat_a, site_id, 'Dresses', 'dresses' from _ids
union all select cat_b, site_b_id, 'Shoes', 'shoes' from _ids;

insert into public.products (id, site_id, category_id, name, slug, price_kobo, active)
select prod_a,     site_id,   cat_a, 'Active dress',   'active-dress',   500000, true  from _ids
union all select prod_a_off, site_id,   cat_a, 'Inactive dress', 'inactive-dress', 400000, false from _ids
union all select prod_b,     site_b_id, cat_b, 'Draft shoe',     'draft-shoe',     300000, true  from _ids;

-- var_a1 stock 5, var_a2 stock 1, var_a3 untracked (null).
insert into public.product_variants (id, product_id, site_id, options, stock)
select var_a1,    prod_a,     site_id,   '{"Size":"S"}'::jsonb, 5    from _ids
union all select var_a2,    prod_a,     site_id,   '{"Size":"M"}'::jsonb, 1    from _ids
union all select var_a3,    prod_a,     site_id,   '{"Size":"L"}'::jsonb, null from _ids
union all select var_a_off, prod_a_off, site_id,   '{"Size":"S"}'::jsonb, 9    from _ids
union all select var_b,     prod_b,     site_b_id, '{"Size":"42"}'::jsonb, 4   from _ids;

-- order_a: pending, will be marked paid (var_a2 short -> stock_issue).
-- order_a_mm: pending, used for the amount-mismatch path.
-- order_a_st: already paid, used for status-change tests.
-- order_b: site B, cancelled (not_pending path).
insert into public.orders (id, site_id, reference, status, customer_name, customer_email, customer_phone,
  delivery_method, subtotal_kobo, delivery_kobo, total_kobo, payment_mode, paid_at)
select order_a,    site_id,   'ZZ-A-' || substr(order_a::text, 1, 8),    'pending',   'Ada', 'ada@example.test', '0800', 'delivery', 3000000, 150000, 3150000, 'platform', null  from _ids
union all select order_a_mm, site_id,   'ZZ-AMM-' || substr(order_a_mm::text, 1, 8), 'pending',   'Bo',  'bo@example.test',  '0801', 'pickup',    500000,      0,  500000, 'platform', null  from _ids
union all select order_a_st, site_id,   'ZZ-AST-' || substr(order_a_st::text, 1, 8), 'paid',      'Cy',  'cy@example.test',  '0802', 'pickup',    500000,      0,  500000, 'platform', now() from _ids
union all select order_b,    site_b_id, 'ZZ-B-' || substr(order_b::text, 1, 8),    'cancelled', 'Di',  'di@example.test',  '0803', 'pickup',    300000,      0,  300000, 'platform', null  from _ids;

-- order_a items: var_a1 x2 (5 -> 3), var_a2 x3 (1 -> 0, short), var_a3 x1 (untracked).
insert into public.order_items (order_id, site_id, product_id, variant_id, name, unit_price_kobo, quantity, line_total_kobo)
select order_a,    site_id,   prod_a, var_a1, 'Active dress', 500000, 2, 1000000 from _ids
union all select order_a,    site_id,   prod_a, var_a2, 'Active dress', 500000, 3, 1500000 from _ids
union all select order_a,    site_id,   prod_a, var_a3, 'Active dress', 500000, 1,  500000 from _ids
union all select order_a_mm, site_id,   prod_a, var_a1, 'Active dress', 500000, 1,  500000 from _ids
union all select order_a_st, site_id,   prod_a, var_a3, 'Active dress', 500000, 1,  500000 from _ids
union all select order_b,    site_b_id, prod_b, var_b,  'Draft shoe',   300000, 1,  300000 from _ids;

-- Sanity (as postgres).
do $$
begin
  perform zz_chk.expect_count('select count(*) from public.products where site_id = (select site_id from _ids)', 2, 'setup: 2 products on site A');
  perform zz_chk.expect_count('select count(*) from public.order_items where site_id = (select site_id from _ids)', 5, 'setup: 5 order items on site A');
end $$;

-- =============================================================================
-- ANON (published site A, draft site B)
-- =============================================================================
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', a), 1, 'anon sees only the active product of published site A');
  perform zz_chk.expect_count(format('select count(*) from public.products where id = %L', (select prod_a_off from _ids)), 0, 'anon cannot see inactive product');
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', b), 0, 'anon cannot see draft site B products');
  perform zz_chk.expect_count(format('select count(*) from public.product_variants where site_id = %L', a), 3, 'anon sees variants of active product only');
  perform zz_chk.expect_count(format('select count(*) from public.product_variants where site_id = %L', b), 0, 'anon cannot see draft site B variants');
  perform zz_chk.expect_count(format('select count(*) from public.product_categories where site_id = %L', a), 1, 'anon sees published site categories');
  perform zz_chk.expect_count(format('select count(*) from public.product_categories where site_id = %L', b), 0, 'anon cannot see draft site categories');
  perform zz_chk.expect_count(format('select count(*) from public.shop_settings where site_id = %L', a), 1, 'anon sees enabled shop_settings of published site');
  perform zz_chk.expect_count(format('select count(*) from public.shop_settings where site_id = %L', b), 0, 'anon cannot see draft site shop_settings');

  -- no grants at all on orders / items / secrets for anon
  perform zz_chk.expect_fail('select count(*) from public.orders', 'anon reads orders', '42501');
  perform zz_chk.expect_fail('select count(*) from public.order_items', 'anon reads order_items', '42501');
  perform zz_chk.expect_fail('select count(*) from public.shop_payment_secrets', 'anon reads payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.orders (site_id, reference, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo) values (%L, 'ZZ-ANON', 'x', 'x@example.test', '0', 'pickup', 1, 1)$q$, a), 'anon inserts order', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.products (site_id, name, slug, price_kobo) values (%L, 'x', 'zz-anon', 1)$q$, a), 'anon inserts product', '42501');
  perform zz_chk.expect_fail(format('update public.products set price_kobo = 1 where site_id = %L', a), 'anon updates product', '42501');
  perform zz_chk.expect_fail(format($q$select public.mark_order_paid(%L, 'x', 1)$q$, (select order_a from _ids)), 'anon executes mark_order_paid', '42501');
end $$;
reset role;

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
  st uuid := (select order_a_st from _ids);
  guard constant text := 'Only Sulvatech can change this setting.';
  only_status constant text := 'Only the order status can be changed.';
  pay_status constant text := 'Payment status is set by the payment provider.';
  zz_cat uuid := gen_random_uuid();
  zz_prod uuid := gen_random_uuid();
begin
  -- reads: everything on own site incl. inactive + orders; nothing on draft site B
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', a), 2, 'owner reads incl. inactive products');
  perform zz_chk.expect_count(format('select count(*) from public.product_variants where site_id = %L', a), 4, 'owner reads all variants');
  perform zz_chk.expect_count(format('select count(*) from public.orders where site_id = %L', a), 3, 'owner reads orders');
  perform zz_chk.expect_count(format('select count(*) from public.order_items where site_id = %L', a), 5, 'owner reads order_items');
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', b), 0, 'owner cannot read site B products');
  perform zz_chk.expect_count(format('select count(*) from public.orders where site_id = %L', b), 0, 'owner cannot read site B orders');

  -- catalogue writes on own site
  perform zz_chk.expect_rows(format($q$insert into public.product_categories (id, site_id, name, slug) values (%L, %L, 'Bags', 'zz-bags')$q$, zz_cat, a), 1, 'owner inserts category');
  perform zz_chk.expect_rows(format($q$insert into public.products (id, site_id, category_id, name, slug, price_kobo) values (%L, %L, %L, 'Bag', 'zz-bag', 100000)$q$, zz_prod, a, zz_cat), 1, 'owner inserts product');
  perform zz_chk.expect_rows(format($q$insert into public.product_variants (product_id, site_id, options, stock) values (%L, %L, '{"Colour":"Black"}'::jsonb, 2)$q$, zz_prod, a), 1, 'owner inserts variant');
  perform zz_chk.expect_rows(format('update public.products set price_kobo = 120000 where id = %L', zz_prod), 1, 'owner updates price');
  perform zz_chk.expect_rows(format('delete from public.product_categories where id = %L', zz_cat), 1, 'owner deletes category');
  perform zz_chk.expect_count(format('select count(*) from public.products where id = %L and category_id is null', zz_prod), 1, 'deleting category un-categorises product (set null)');
  perform zz_chk.expect_rows(format('delete from public.products where id = %L', zz_prod), 1, 'owner deletes product (variants cascade)');

  -- cross-site catalogue tampering
  perform zz_chk.expect_fail(format($q$insert into public.products (site_id, name, slug, price_kobo) values (%L, 'x', 'zz-x', 1)$q$, b), 'owner inserts product on site B', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.product_variants (product_id, site_id) values (%L, %L)$q$, (select prod_b from _ids), a), 'owner attaches variant to site B product (same-site FK)', '23503');
  perform zz_chk.expect_fail(format($q$insert into public.products (site_id, category_id, name, slug, price_kobo) values (%L, %L, 'x', 'zz-xcat', 1)$q$, a, (select cat_b from _ids)), 'owner uses site B category (same-site FK)', '23503');
  perform zz_chk.expect_rows(format('update public.products set price_kobo = 1 where site_id = %L', b), 0, 'owner updates site B products (0 rows)');

  -- shop_settings
  perform zz_chk.expect_rows(format('update public.shop_settings set delivery_fee_kobo = 200000, pickup_enabled = true where site_id = %L', a), 1, 'owner updates delivery fee / pickup');
  perform zz_chk.expect_fail(format('update public.shop_settings set platform_fee_bps = 1 where site_id = %L', a), 'owner changes platform_fee_bps', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.shop_settings set payment_mode = 'own_keys' where site_id = %L$q$, a), 'owner changes payment_mode directly', '42501', guard);
  perform zz_chk.expect_fail(format($q$update public.shop_settings set paystack_public_key = 'pk_test_x' where site_id = %L$q$, a), 'owner changes paystack_public_key directly', '42501', guard);
  perform zz_chk.expect_fail(format('delete from public.shop_settings where site_id = %L', a), 'owner deletes shop_settings (no grant)', '42501');
  perform zz_chk.expect_rows(format('update public.shop_settings set enabled = false where site_id = %L', b), 0, 'owner updates site B shop_settings (0 rows)');

  -- orders: status only
  perform zz_chk.expect_fail(format('update public.orders set total_kobo = 1 where id = %L', st), 'owner changes order total', '42501', only_status);
  perform zz_chk.expect_fail(format($q$update public.orders set customer_email = 'evil@example.test' where id = %L$q$, st), 'owner changes customer_email', '42501', only_status);
  perform zz_chk.expect_fail(format($q$update public.orders set status = 'fulfilled', paid_at = null where id = %L$q$, st), 'owner changes status + paid_at together', '42501', only_status);
  perform zz_chk.expect_fail(format($q$update public.orders set status = 'paid' where id = %L$q$, (select order_a from _ids)), 'owner marks pending order paid', '42501', pay_status);
  perform zz_chk.expect_fail(format($q$update public.orders set status = 'pending' where id = %L$q$, st), 'owner resets order to pending', '42501', pay_status);
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'refunded' where id = %L$q$, st), 1, 'owner marks order refunded');
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'fulfilled' where id = %L$q$, st), 1, 'owner marks order fulfilled');
  perform zz_chk.expect_fail(format($q$insert into public.orders (site_id, reference, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo) values (%L, 'ZZ-OWN', 'x', 'x@example.test', '0', 'pickup', 1, 1)$q$, a), 'owner inserts order', '42501');
  perform zz_chk.expect_fail(format('delete from public.orders where id = %L', st), 'owner deletes order', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.order_items (order_id, site_id, name, unit_price_kobo, quantity, line_total_kobo) values (%L, %L, 'x', 1, 1, 1)$q$, st, a), 'owner inserts order_item', '42501');
  perform zz_chk.expect_fail(format('update public.order_items set unit_price_kobo = 0 where site_id = %L', a), 'owner updates order_items', '42501');

  -- secrets + payment function
  perform zz_chk.expect_fail('select count(*) from public.shop_payment_secrets', 'owner reads payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$update public.shop_payment_secrets set subaccount_code = 'ACCT_evil' where site_id = %L$q$, a), 'owner updates payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.shop_payment_secrets (site_id) values (%L)$q$, b), 'owner inserts payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$select public.mark_order_paid(%L, 'x', 3150000)$q$, (select order_a from _ids)), 'owner executes mark_order_paid', '42501');
end $$;
reset role;

-- =============================================================================
-- STAFF (site A)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  st uuid := (select order_a_st from _ids);
  only_status constant text := 'Only the order status can be changed.';
begin
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', a), 2, 'staff reads incl. inactive products');
  perform zz_chk.expect_count(format('select count(*) from public.orders where site_id = %L', a), 3, 'staff reads orders');
  perform zz_chk.expect_count(format('select count(*) from public.order_items where site_id = %L', a), 5, 'staff reads order_items');
  perform zz_chk.expect_count(format('select count(*) from public.shop_settings where site_id = %L', a), 1, 'staff reads shop_settings');

  -- catalogue: read-only
  perform zz_chk.expect_rows(format('update public.products set price_kobo = 1 where site_id = %L', a), 0, 'staff updates product price (0 rows)');
  perform zz_chk.expect_rows(format('update public.product_variants set price_kobo = 1, stock = 99 where site_id = %L', a), 0, 'staff updates variants (0 rows)');
  perform zz_chk.expect_rows(format('delete from public.products where site_id = %L', a), 0, 'staff deletes products (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.products (site_id, name, slug, price_kobo) values (%L, 'x', 'zz-staff', 1)$q$, a), 'staff inserts product', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.product_categories (site_id, name, slug) values (%L, 'x', 'zz-staff')$q$, a), 'staff inserts category', '42501');
  perform zz_chk.expect_rows(format('update public.shop_settings set delivery_fee_kobo = 1 where site_id = %L', a), 0, 'staff updates shop_settings (0 rows)');

  -- orders: status only, never refunded
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'cancelled' where id = %L$q$, st), 1, 'staff cancels order');
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'fulfilled' where id = %L$q$, st), 1, 'staff fulfils order');
  perform zz_chk.expect_fail(format($q$update public.orders set status = 'refunded' where id = %L$q$, st), 'staff marks order refunded', '42501', 'Only the shop owner can mark an order refunded.');
  perform zz_chk.expect_fail(format('update public.orders set total_kobo = 1 where id = %L', st), 'staff changes order total', '42501', only_status);

  perform zz_chk.expect_fail('select count(*) from public.shop_payment_secrets', 'staff reads payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$select public.mark_order_paid(%L, 'x', 3150000)$q$, (select order_a from _ids)), 'staff executes mark_order_paid', '42501');
end $$;
reset role;

-- =============================================================================
-- OUTSIDER (authenticated, not a member)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', a), 1, 'outsider sees only active product of published site');
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', b), 0, 'outsider cannot see draft site products');
  perform zz_chk.expect_count(format('select count(*) from public.orders where site_id = %L', a), 0, 'outsider reads orders (0)');
  perform zz_chk.expect_count(format('select count(*) from public.order_items where site_id = %L', a), 0, 'outsider reads order_items (0)');
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'cancelled' where site_id = %L$q$, a), 0, 'outsider updates orders (0 rows)');
  perform zz_chk.expect_rows(format('update public.products set price_kobo = 1 where site_id = %L', a), 0, 'outsider updates products (0 rows)');
  perform zz_chk.expect_rows(format('update public.shop_settings set delivery_fee_kobo = 1 where site_id = %L', a), 0, 'outsider updates shop_settings (0 rows)');
  perform zz_chk.expect_fail(format($q$insert into public.products (site_id, name, slug, price_kobo) values (%L, 'x', 'zz-out', 1)$q$, a), 'outsider inserts product', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.shop_settings (site_id) values (%L)$q$, b), 'outsider inserts shop_settings', '42501');
  perform zz_chk.expect_fail(format($q$insert into public.orders (site_id, reference, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo) values (%L, 'ZZ-OUT', 'x', 'x@example.test', '0', 'pickup', 1, 1)$q$, a), 'outsider inserts order', '42501');
  perform zz_chk.expect_fail('select count(*) from public.shop_payment_secrets', 'outsider reads payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$select public.mark_order_paid(%L, 'x', 3150000)$q$, (select order_a from _ids)), 'outsider executes mark_order_paid', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN (temp admin): bypasses guards; still no client access to secrets / mark_order_paid
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare
  a uuid := (select site_id from _ids);
  b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_rows(format('update public.shop_settings set platform_fee_bps = 250 where site_id = %L', a), 1, 'admin sets platform_fee_bps');
  perform zz_chk.expect_count(format('select count(*) from public.orders where site_id = %L', b), 1, 'admin reads draft site B orders');
  perform zz_chk.expect_count(format('select count(*) from public.products where site_id = %L', b), 1, 'admin reads draft site B products');
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'refunded' where id = %L$q$, (select order_a_st from _ids)), 1, 'admin marks order refunded');
  perform zz_chk.expect_fail('select count(*) from public.shop_payment_secrets', 'admin (client) reads payment secrets', '42501');
  perform zz_chk.expect_fail(format($q$select public.mark_order_paid(%L, 'x', 3150000)$q$, (select order_a from _ids)), 'admin (client) executes mark_order_paid', '42501');
end $$;
reset role;

-- =============================================================================
-- postgres: mark_order_paid behaviour
-- =============================================================================
do $$
declare
  oa uuid := (select order_a from _ids);
  omm uuid := (select order_a_mm from _ids);
  v1 uuid := (select var_a1 from _ids);
  v2 uuid := (select var_a2 from _ids);
  v3 uuid := (select var_a3 from _ids);
begin
  -- mismatch first: flags, does not mark paid, does not touch stock
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-MM', 500001)$q$, omm), 'amount_mismatch', 'mismatch returns amount_mismatch');
  perform zz_chk.expect_eq(format('select amount_mismatch::text from public.orders where id = %L', omm), 'true', 'mismatch flags order');
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', omm), 'pending', 'mismatch leaves order pending');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v1), '5', 'mismatch leaves stock untouched');
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-MM', null)$q$, omm), 'amount_mismatch', 'null amount is a mismatch');

  -- happy path with insufficient stock on var_a2
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-A', 3150000)$q$, oa), 'paid', 'mark paid returns paid');
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', oa), 'paid', 'order status paid');
  perform zz_chk.expect_eq(format('select paystack_reference from public.orders where id = %L', oa), 'PSK-A', 'paystack_reference stored');
  perform zz_chk.expect_eq(format('select (paid_at is not null)::text from public.orders where id = %L', oa), 'true', 'paid_at set');
  perform zz_chk.expect_eq(format('select stock_issue::text from public.orders where id = %L', oa), 'true', 'insufficient stock flags stock_issue');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v1), '3', 'var_a1 stock 5 -> 3');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v2), '0', 'var_a2 stock 1 -> 0 (never negative)');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v3), null, 'untracked var_a3 stays null');

  -- idempotent
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-A2', 3150000)$q$, oa), 'already_paid', 'second call returns already_paid');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v1), '3', 'second call does not decrement again');
  perform zz_chk.expect_eq(format('select paystack_reference from public.orders where id = %L', oa), 'PSK-A', 'second call keeps original reference');

  -- mismatched order can still be paid with the right amount; sufficient stock -> no stock_issue
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-MM2', 500000)$q$, omm), 'paid', 'mismatch order paid with correct amount');
  perform zz_chk.expect_eq(format('select stock_issue::text from public.orders where id = %L', omm), 'false', 'sufficient stock: no stock_issue');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', v1), '2', 'var_a1 stock 3 -> 2');

  -- other states
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-B', 300000)$q$, (select order_b from _ids)), 'not_pending', 'cancelled order returns not_pending');
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', (select var_b from _ids)), '4', 'not_pending leaves stock untouched');
  perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'PSK-X', 1)$q$, gen_random_uuid()), 'not_found', 'unknown order returns not_found');
end $$;

-- =============================================================================
-- postgres / service_role passthrough
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_rows(format('update public.orders set total_kobo = total_kobo where id = %L', (select order_a_st from _ids)), 1, 'postgres updates order columns (guard passthrough)');

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_count(format('select count(*) from public.shop_payment_secrets where site_id = %L', a), 1, 'service_role reads payment secrets');
    perform zz_chk.expect_rows(format($q$update public.shop_settings set payment_mode = 'platform', platform_fee_bps = 100 where site_id = %L$q$, a), 1, 'service_role sets payment_mode / fee (guard passthrough)');
    perform zz_chk.expect_rows(format($q$insert into public.orders (site_id, reference, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo) values (%L, 'ZZ-SVC-' || substr(gen_random_uuid()::text, 1, 8), 'x', 'x@example.test', '0', 'pickup', 1, 1)$q$, a), 1, 'service_role inserts order');
    perform zz_chk.expect_eq(format($q$select public.mark_order_paid(%L, 'x', 1)$q$, gen_random_uuid()), 'not_found', 'service_role executes mark_order_paid');
    execute 'reset role';
  else
    raise notice 'SKIPPED: service_role path (role does not exist)';
  end if;
end $$;

-- =============================================================================
-- ANON again: disabled shop hides shop_settings (catalogue visibility is not tied to enabled)
-- =============================================================================
update public.shop_settings set enabled = false where site_id = (select site_id from _ids);
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
do $$
begin
  perform zz_chk.expect_count('select count(*) from public.shop_settings where site_id = (select site_id from _ids)', 0, 'anon cannot see disabled shop_settings');
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
