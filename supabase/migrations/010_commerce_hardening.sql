-- 010_commerce_hardening.sql — run once in Supabase SQL Editor (after 006, 007; independent of 008/009/011).
-- 1. shop_audit_log: who changed payout bank / Paystack keys / platform fee (service role only).
-- 2. orders.paystack_key_ref: snapshot of the Paystack key identity at checkout
--    ('platform' or last4 of the shop's own secret key) so key rotation cannot silently strand orders.
-- 3. M7: order_items -> products / product_variants become same-site composite FKs.
-- 4. M8: site_id is immutable for client roles on product_categories / products / product_variants.
-- 5. expire_stale_pending_orders(): cancels pending orders older than N hours (no stock effects).
-- 6. create_order(): atomic order + items insert (service role only), replaces the two-step insert.
-- Requires Postgres 15+ (FK "on delete set null (column)"). Idempotent: safe to re-run.

do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception '010_commerce_hardening.sql requires Postgres 15 or newer (found %).', current_setting('server_version');
  end if;
end $$;

-- =============================================================================
-- 1) Audit log (service role only: RLS on, no policies, no client grants)
-- =============================================================================
create table if not exists public.shop_audit_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  actor_id uuid null,
  actor_role text not null check (actor_role in ('admin','owner')),
  action text not null check (action in ('bank_changed','keys_set','keys_removed','fee_changed')),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),  -- never secrets
  created_at timestamptz not null default now()
);
create index if not exists shop_audit_log_site_created_idx on public.shop_audit_log (site_id, created_at desc);
alter table public.shop_audit_log enable row level security;
revoke all on table public.shop_audit_log from anon, authenticated;
grant all on table public.shop_audit_log to service_role;

-- =============================================================================
-- 2) Key identity snapshot on orders (orders_member_guard already freezes every column but status)
-- =============================================================================
alter table public.orders
  add column if not exists paystack_key_ref text null
  check (paystack_key_ref is null or char_length(paystack_key_ref) between 1 and 16);

-- =============================================================================
-- 3) M7: same-site composite FKs on order_items
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'product_variants_id_site_key' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_id_site_key unique (id, site_id);
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'order_items_product_same_site_fk' and conrelid = 'public.order_items'::regclass) then
    alter table public.order_items add constraint order_items_product_same_site_fk
      foreign key (product_id, site_id) references public.products (id, site_id) on delete set null (product_id);
  end if;
  if not exists (select 1 from pg_constraint
                 where conname = 'order_items_variant_same_site_fk' and conrelid = 'public.order_items'::regclass) then
    alter table public.order_items add constraint order_items_variant_same_site_fk
      foreign key (variant_id, site_id) references public.product_variants (id, site_id) on delete set null (variant_id);
  end if;

  -- The single-column FKs from 006 are now redundant.
  alter table public.order_items drop constraint if exists order_items_product_id_fkey;
  alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
end $$;

-- =============================================================================
-- 4) M8: site_id immutable for client roles (not SECURITY DEFINER: current_user is the invoker, so
--    service_role / postgres pass through). No admin bypass: moving a row between sites is never a client action.
-- =============================================================================
create or replace function public.catalogue_site_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated','anon') and new.site_id is distinct from old.site_id then
    raise exception 'site_id cannot be changed.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists product_categories_site_immutable on public.product_categories;
create trigger product_categories_site_immutable before update of site_id on public.product_categories
  for each row execute function public.catalogue_site_immutable();
drop trigger if exists products_site_immutable on public.products;
create trigger products_site_immutable before update of site_id on public.products
  for each row execute function public.catalogue_site_immutable();
drop trigger if exists product_variants_site_immutable on public.product_variants;
create trigger product_variants_site_immutable before update of site_id on public.product_variants
  for each row execute function public.catalogue_site_immutable();

-- =============================================================================
-- 5) Stale pending orders: cancel pending, unpaid orders older than p_hours (default 24, minimum 1).
--    Stock is only decremented when an order is paid, so there is nothing to release.
--    A payment that arrives later is recorded by mark_order_paid as 'paid_after_cancel' (owner refunds).
--    Returns the number of orders cancelled. Service role only. Schedule it, e.g. (pg_cron):
--      select cron.schedule('expire-pending-orders', '17 * * * *', $$select public.expire_stale_pending_orders()$$);
-- =============================================================================
create index if not exists orders_pending_created_idx on public.orders (created_at) where status = 'pending';

create or replace function public.expire_stale_pending_orders(p_hours integer default 24)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_hours is null or p_hours < 1 then
    raise exception 'p_hours must be at least 1.' using errcode = '22023';
  end if;
  with stale as (
    select id from public.orders
    where status = 'pending' and paid_at is null
      and created_at < now() - make_interval(hours => p_hours)
    for update skip locked
  )
  update public.orders o set status = 'cancelled' from stale where o.id = stale.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_stale_pending_orders(integer) from public, anon, authenticated;
grant execute on function public.expire_stale_pending_orders(integer) to service_role;

-- =============================================================================
-- 6) create_order: order + items in one transaction. Pricing stays in the app (server-side, from the
--    database catalogue); this function only checks the numbers are internally consistent and
--    lets the same-site FKs reject items that do not belong to p_site.
--    p_items: [{product_id, variant_id, name, variant_label, unit_price_kobo, quantity, line_total_kobo}, ...]
--    Returns the new order id. A duplicate reference raises unique_violation (23505): caller retries.
-- =============================================================================
drop function if exists public.create_order(uuid, text, text, text, text, text, text, text, bigint, bigint, bigint, text, text, jsonb);
create or replace function public.create_order(
  p_site uuid, p_reference text, p_customer_name text, p_customer_email text, p_customer_phone text,
  p_delivery_method text, p_delivery_address text, p_notes text,
  p_subtotal_kobo bigint, p_delivery_kobo bigint, p_total_kobo bigint,
  p_payment_mode text, p_key_ref text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_count integer;
  v_sum bigint;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'p_items must be a JSON array.' using errcode = '22023';
  end if;
  select count(*), coalesce(sum(x.line_total_kobo), 0) into v_count, v_sum
  from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, name text, variant_label text,
                                        unit_price_kobo bigint, quantity integer, line_total_kobo bigint);
  if v_count < 1 or v_count > 100 then
    raise exception 'An order needs between 1 and 100 items.' using errcode = '22023';
  end if;
  if v_sum <> p_subtotal_kobo or p_subtotal_kobo + p_delivery_kobo <> p_total_kobo then
    raise exception 'Order totals do not add up.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, name text, variant_label text,
                                                   unit_price_kobo bigint, quantity integer, line_total_kobo bigint)
    where x.quantity is null or x.unit_price_kobo is null or x.line_total_kobo is null
       or x.unit_price_kobo * x.quantity <> x.line_total_kobo
  ) then
    raise exception 'Item line totals do not add up.' using errcode = '22023';
  end if;

  insert into public.orders (site_id, reference, status, customer_name, customer_email, customer_phone,
    delivery_method, delivery_address, notes, subtotal_kobo, delivery_kobo, total_kobo, payment_mode, paystack_key_ref)
  values (p_site, p_reference, 'pending', p_customer_name, p_customer_email, p_customer_phone,
    p_delivery_method, p_delivery_address, p_notes, p_subtotal_kobo, p_delivery_kobo, p_total_kobo,
    p_payment_mode, p_key_ref)
  returning id into v_id;

  insert into public.order_items (order_id, site_id, product_id, variant_id, name, variant_label,
    unit_price_kobo, quantity, line_total_kobo)
  select v_id, p_site, x.product_id, x.variant_id, x.name, x.variant_label,
         x.unit_price_kobo, x.quantity, x.line_total_kobo
  from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, name text, variant_label text,
                                        unit_price_kobo bigint, quantity integer, line_total_kobo bigint);
  return v_id;
end $$;
revoke all on function public.create_order(uuid, text, text, text, text, text, text, text, bigint, bigint, bigint, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, text, text, text, text, text, bigint, bigint, bigint, text, text, jsonb)
  to service_role;
