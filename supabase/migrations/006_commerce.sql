-- 006_commerce.sql — run once in Supabase SQL Editor (after schema.sql, 001-005).
-- Shops: catalogue (categories, products, variants), shop settings, payment secrets, orders.
-- Depends on 005 helpers: public.site_role / is_site_member / can_edit_site.
-- Requires Postgres 15+ (FK "on delete set null (column)").
-- Idempotent: create if not exists, drop policy/trigger if exists, create or replace function.
-- Money is integer kobo everywhere.

-- =============================================================================
-- 1) TABLES
-- =============================================================================

-- Public-facing shop settings (no secrets here; readable by the public for published sites).
create table if not exists public.shop_settings (
  site_id uuid primary key references public.sites(id) on delete cascade,
  enabled boolean not null default false,
  currency text not null default 'NGN' check (currency = 'NGN'),
  delivery_fee_kobo integer not null default 0 check (delivery_fee_kobo >= 0),
  pickup_enabled boolean not null default false,
  pickup_note text null,
  payment_mode text null check (payment_mode in ('platform','own_keys')),
  paystack_public_key text null,
  platform_fee_bps integer not null default 0 check (platform_fee_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);

-- Payment secrets: service role only (RLS on, no policies, no client grants).
create table if not exists public.shop_payment_secrets (
  site_id uuid primary key references public.sites(id) on delete cascade,
  subaccount_code text null,
  settlement_bank text null,
  account_last4 text null,
  secret_key_ciphertext text null,
  secret_key_last4 text null,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  unique (site_id, slug),
  unique (id, site_id)            -- target for same-site composite FK from products
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  category_id uuid null,
  name text not null,
  slug text not null,
  description text null,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  price_kobo integer not null check (price_kobo >= 0),
  compare_at_kobo integer null check (compare_at_kobo >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug),
  unique (id, site_id),           -- target for same-site composite FK from variants
  -- category must belong to the same site; deleting a category un-categorises its products.
  constraint products_category_same_site_fk foreign key (category_id, site_id)
    references public.product_categories (id, site_id) on delete set null (category_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  site_id uuid not null references public.sites(id) on delete cascade,
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price_kobo integer null check (price_kobo >= 0),   -- null = use product price
  stock integer null check (stock >= 0),             -- null = untracked
  sku text null,
  position integer not null default 0,
  -- variant must belong to a product of the same site.
  constraint product_variants_product_same_site_fk foreign key (product_id, site_id)
    references public.products (id, site_id) on delete cascade
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('delivery','pickup')),
  delivery_address text null,
  notes text null,
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  delivery_kobo integer not null default 0 check (delivery_kobo >= 0),
  total_kobo integer not null check (total_kobo >= 0),
  payment_mode text null check (payment_mode in ('platform','own_keys')),
  paystack_reference text null,
  paid_at timestamptz null,
  stock_issue boolean not null default false,
  amount_mismatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, site_id)            -- target for same-site composite FK from order_items
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  site_id uuid not null references public.sites(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  variant_id uuid null references public.product_variants(id) on delete set null,
  name text not null,
  variant_label text null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity > 0),
  line_total_kobo integer not null check (line_total_kobo >= 0),
  constraint order_items_order_same_site_fk foreign key (order_id, site_id)
    references public.orders (id, site_id) on delete cascade
);

-- =============================================================================
-- 2) INDEXES
-- (product_categories / products site_id lookups are covered by unique (site_id, slug);
--  orders.reference by its unique constraint; orders site_id by (site_id, created_at desc).)
-- =============================================================================
create index if not exists products_category_idx on public.products (category_id);
create index if not exists product_variants_site_idx on public.product_variants (site_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id, site_id);
create index if not exists orders_site_created_idx on public.orders (site_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id, site_id);
create index if not exists order_items_site_idx on public.order_items (site_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- =============================================================================
-- 3) updated_at triggers (public.set_updated_at from schema.sql)
-- =============================================================================
drop trigger if exists trg_shop_settings_set_updated_at on public.shop_settings;
create trigger trg_shop_settings_set_updated_at before update on public.shop_settings
  for each row execute function public.set_updated_at();
drop trigger if exists trg_shop_payment_secrets_set_updated_at on public.shop_payment_secrets;
create trigger trg_shop_payment_secrets_set_updated_at before update on public.shop_payment_secrets
  for each row execute function public.set_updated_at();
drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4) RLS + GRANTS
-- Supabase default privileges grant ALL on new tables to anon/authenticated, so every table
-- starts from "revoke all" and grants only what its policies are meant to allow.
-- =============================================================================
alter table public.shop_settings enable row level security;
alter table public.shop_payment_secrets enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.shop_settings, public.shop_payment_secrets, public.product_categories,
  public.products, public.product_variants, public.orders, public.order_items
  from anon, authenticated;
grant all on table public.shop_settings, public.shop_payment_secrets, public.product_categories,
  public.products, public.product_variants, public.orders, public.order_items
  to service_role;

-- Public catalogue tables: anon reads, authenticated reads + owner writes.
grant select on public.shop_settings, public.product_categories, public.products, public.product_variants to anon;
grant select, insert, update, delete on public.product_categories, public.products, public.product_variants to authenticated;
-- shop_settings: no client delete (delete + re-insert would reset Sulvatech-only fields).
grant select, insert, update on public.shop_settings to authenticated;
-- orders: members read and update status; insert/delete only via service role.
grant select, update on public.orders to authenticated;
-- order_items: members read only.
grant select on public.order_items to authenticated;
-- shop_payment_secrets: nothing for clients (revoked above); no policies.

-- shop_settings
drop policy if exists public_read on public.shop_settings;
create policy public_read on public.shop_settings for select to anon, authenticated
  using (enabled and exists (select 1 from public.sites s
         where s.id = shop_settings.site_id and s.status = 'published'::public.site_status));
drop policy if exists members_read on public.shop_settings;
create policy members_read on public.shop_settings for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists owners_insert on public.shop_settings;
create policy owners_insert on public.shop_settings for insert to authenticated
  with check (public.can_edit_site(site_id));
drop policy if exists owners_update on public.shop_settings;
create policy owners_update on public.shop_settings for update to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- product_categories
drop policy if exists public_read on public.product_categories;
create policy public_read on public.product_categories for select to anon, authenticated
  using (exists (select 1 from public.sites s
         where s.id = product_categories.site_id and s.status = 'published'::public.site_status));
drop policy if exists members_read on public.product_categories;
create policy members_read on public.product_categories for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists owners_write on public.product_categories;
create policy owners_write on public.product_categories for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- products
drop policy if exists public_read on public.products;
create policy public_read on public.products for select to anon, authenticated
  using (active and exists (select 1 from public.sites s
         where s.id = products.site_id and s.status = 'published'::public.site_status));
drop policy if exists members_read on public.products;
create policy members_read on public.products for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists owners_write on public.products;
create policy owners_write on public.products for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- product_variants (public: parent product active + site published)
drop policy if exists public_read on public.product_variants;
create policy public_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p
                 join public.sites s on s.id = p.site_id
                 where p.id = product_variants.product_id and p.site_id = product_variants.site_id
                   and p.active and s.status = 'published'::public.site_status));
drop policy if exists members_read on public.product_variants;
create policy members_read on public.product_variants for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists owners_write on public.product_variants;
create policy owners_write on public.product_variants for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- orders: members read + update (status only, enforced by orders_member_guard). No insert/delete policy.
drop policy if exists members_read on public.orders;
create policy members_read on public.orders for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists members_update_status on public.orders;
create policy members_update_status on public.orders for update to authenticated
  using (public.is_site_member(site_id)) with check (public.is_site_member(site_id));

-- order_items: members read only.
drop policy if exists members_read on public.order_items;
create policy members_read on public.order_items for select to authenticated
  using (public.is_site_member(site_id));

-- =============================================================================
-- 5) GUARDS (not SECURITY DEFINER: current_user is the invoking role, so service_role /
--    postgres / mark_order_paid pass through; only client roles are restricted; admins bypass).
-- =============================================================================

-- shop_settings: platform fee is Sulvatech-only; payment mode + public key are written by the
-- payment-settings server route (service role) together with shop_payment_secrets.
create or replace function public.shop_settings_owner_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.platform_fee_bps <> 0 or new.payment_mode is not null or new.paystack_public_key is not null then
        raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
      end if;
    elsif new.platform_fee_bps is distinct from old.platform_fee_bps
       or new.payment_mode is distinct from old.payment_mode
       or new.paystack_public_key is distinct from old.paystack_public_key
       or new.site_id is distinct from old.site_id then
      raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists shop_settings_owner_guard on public.shop_settings;
create trigger shop_settings_owner_guard before insert or update on public.shop_settings
  for each row execute function public.shop_settings_owner_guard();

-- orders: members may change only status; payment states (pending/paid) are server-only;
-- only owners may set refunded.
create or replace function public.orders_member_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Only the order status can be changed.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if new.status in ('pending','paid') then
        raise exception 'Payment status is set by the payment provider.' using errcode = '42501';
      end if;
      if new.status = 'refunded' and public.site_role(old.site_id) is distinct from 'owner' then
        raise exception 'Only the shop owner can mark an order refunded.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_member_guard on public.orders;
create trigger orders_member_guard before update on public.orders
  for each row execute function public.orders_member_guard();

-- =============================================================================
-- 6) mark_order_paid — service role only.
-- Returns: 'paid' | 'already_paid' | 'not_pending' | 'amount_mismatch' | 'not_found'.
-- Locks the order row; idempotent; decrements tracked variant stock (never below 0) and
-- flags stock_issue when stock was insufficient (order is still marked paid).
-- =============================================================================
create or replace function public.mark_order_paid(p_order uuid, p_paystack_ref text, p_amount_kobo int)
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  it record;
  cur integer;
  short boolean := false;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return 'not_found'; end if;
  if o.status = 'paid' or o.paid_at is not null then return 'already_paid'; end if;
  if o.status <> 'pending' then return 'not_pending'; end if;
  if p_amount_kobo is null or p_amount_kobo <> o.total_kobo then
    update public.orders set amount_mismatch = true where id = o.id;
    return 'amount_mismatch';
  end if;

  -- Lock variants in id order (consistent lock order across concurrent payments).
  for it in
    select oi.variant_id, sum(oi.quantity)::integer as qty
    from public.order_items oi
    where oi.order_id = o.id and oi.variant_id is not null
    group by oi.variant_id
    order by oi.variant_id
  loop
    select v.stock into cur from public.product_variants v
      where v.id = it.variant_id and v.site_id = o.site_id
      for update;
    if found and cur is not null then
      if cur < it.qty then short := true; end if;
      update public.product_variants set stock = greatest(cur - it.qty, 0) where id = it.variant_id;
    end if;
  end loop;

  update public.orders
     set status = 'paid', paid_at = now(), paystack_reference = p_paystack_ref,
         stock_issue = stock_issue or short
   where id = o.id;
  return 'paid';
end $$;
revoke all on function public.mark_order_paid(uuid, text, int) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, int) to service_role;
