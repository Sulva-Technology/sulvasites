-- 015_whatsapp_orders_check.sql
-- Manual check for 015_whatsapp_orders.sql. Paste into the Supabase SQL Editor (postgres role) AFTER
-- running 005, 006, 007, 010 and 015. Runs in one transaction and is rolled back; no data is left behind.
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
select site_id,   'zz-wa-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-wa-b-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids;

insert into public.product_categories (id, site_id, name, slug)
select cat_a, site_id, 'A', 'a' from _ids union all select cat_b, site_b_id, 'B', 'b' from _ids;
insert into public.products (id, site_id, category_id, name, slug, price_kobo)
select prod_a, site_id, cat_a, 'Pa', 'pa', 1000 from _ids union all select prod_b, site_b_id, cat_b, 'Pb', 'pb', 1000 from _ids;
insert into public.product_variants (id, product_id, site_id, options, stock)
select var_a, prod_a, site_id, '{"Size":"S"}'::jsonb, 5 from _ids
union all select var_b, prod_b, site_b_id, '{"Size":"S"}'::jsonb, 5 from _ids;

-- second user: member of site B only
create temp table _other (id uuid default gen_random_uuid());
grant select on _other to anon, authenticated;
insert into _other default values;
insert into auth.users (id, email, aud, role)
select id, 'zz-other-' || substr(id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated' from _other;
insert into public.site_members (site_id, user_id, role)
select (select site_b_id from _ids), id, 'owner' from _other;

-- =============================================================================
-- postgres: structure + ACL
-- =============================================================================
do $$
declare
  cw constant text := 'public.create_whatsapp_order(uuid,text,text,text,text,text,text,text,bigint,bigint,bigint,jsonb)';
  cp constant text := 'public.complete_whatsapp_order(uuid)';
begin
  perform zz_chk.expect_eq($q$select column_default from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'channel'$q$, '''paystack''::text', 'orders.channel defaults to paystack');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'anon', cw, 'execute'), 'false', 'anon cannot create whatsapp orders');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'authenticated', cw, 'execute'), 'false', 'authenticated cannot create whatsapp orders');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'anon', cp, 'execute'), 'false', 'anon cannot complete whatsapp orders');
  perform zz_chk.expect_eq(format('select has_function_privilege(%L, %L, %L)::text', 'authenticated', cp, 'execute'), 'true', 'members can call complete_whatsapp_order');
  perform zz_chk.expect_fail($q$insert into public.orders (site_id, reference, customer_name, customer_email, customer_phone, delivery_method, subtotal_kobo, total_kobo, channel)
    select site_id, 'ZZ-W-BAD', 'a', 'a', '1', 'pickup', 0, 0, 'sms' from _ids$q$, 'unknown channel rejected', '23514');
end $$;

-- =============================================================================
-- create_whatsapp_order (postgres) + a normal Paystack order for comparison
-- =============================================================================
do $$
declare
  a uuid := (select site_id from _ids);
  pa uuid := (select prod_a from _ids);
  va uuid := (select var_a from _ids);
  w uuid; p uuid;
  items jsonb := jsonb_build_array(jsonb_build_object('product_id', pa, 'variant_id', va, 'name', 'Pa', 'variant_label', 'S',
                                                      'unit_price_kobo', 1000, 'quantity', 2, 'line_total_kobo', 2000));
begin
  w := public.create_whatsapp_order(a, 'ZZ-W-1', null, null, null, 'delivery', null, null, 2000, 500, 2500, items);
  perform zz_chk.expect_eq(format($q$select channel || '/' || status || '/' || customer_name || '/' || coalesce(payment_mode, '-') from public.orders where id = %L$q$, w), 'whatsapp/pending//-', 'whatsapp order is pending with blank customer');
  p := public.create_order(a, 'ZZ-W-2', 'Ada', 'ada@example.test', '0800', 'pickup', null, null, 2000, 0, 2000, 'platform', 'platform', items);
  perform zz_chk.expect_eq(format('select channel from public.orders where id = %L', p), 'paystack', 'create_order stays paystack');
  perform set_config('zz.wa', w::text, true);
  perform set_config('zz.ps', p::text, true);

  -- a 2-day-old whatsapp order survives the 24h expiry, an 8-day-old one does not
  update public.orders set created_at = now() - interval '2 days' where id = w;
  perform public.expire_stale_pending_orders(24);
  perform zz_chk.expect_eq(format('select status from public.orders where id = %L', w), 'pending', '2-day-old whatsapp order not expired');
  update public.orders set created_at = now() where id = w;
end $$;

-- =============================================================================
-- members
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select id from _other), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_fail(format('select public.complete_whatsapp_order(%L)', current_setting('zz.wa')), 'member of another site cannot complete', '42501');
end $$;

select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare w text := current_setting('zz.wa');
begin
  perform zz_chk.expect_fail(format($q$update public.orders set status = 'paid' where id = %L$q$, w), 'member still cannot set paid directly', '42501');
  perform zz_chk.expect_fail(format('select public.complete_whatsapp_order(%L)', current_setting('zz.ps')), 'paystack order cannot be completed by hand', '42501');
  perform zz_chk.expect_eq(format('select public.complete_whatsapp_order(%L)', w), 'paid', 'owner completes whatsapp order');
  perform zz_chk.expect_eq(format('select status || ''/'' || (paid_at is not null) from public.orders where id = %L', w), 'paid/true', 'order is paid');
  perform zz_chk.expect_eq(format('select public.complete_whatsapp_order(%L)', w), 'already_completed', 'completing twice is a no-op');
  perform zz_chk.expect_rows(format($q$update public.orders set status = 'fulfilled' where id = %L$q$, w), 1, 'owner can then mark fulfilled');
end $$;
reset role;

do $$
begin
  perform zz_chk.expect_eq(format('select stock::text from public.product_variants where id = %L', (select var_a from _ids)), '3', 'completing decremented stock once (5 - 2)');
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
