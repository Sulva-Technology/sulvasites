-- 015_whatsapp_orders.sql — run once in Supabase SQL Editor (after 006 and 010).
-- Orders a shopper sends to the business on WhatsApp instead of paying on Paystack.
--
-- 1. orders.channel: 'paystack' (default, every existing order) or 'whatsapp'.
-- 2. create_whatsapp_order(): create_order (010) + channel = 'whatsapp' in one transaction. Service role only
--    (called by POST /api/shop/[siteId]/whatsapp-order after server-side pricing).
-- 3. complete_whatsapp_order(): a shop member confirms the customer paid in the chat. Marks the order paid
--    through mark_order_paid (006), so stock is decremented exactly like a Paystack payment. The usual
--    orders_member_guard still blocks members from setting 'paid' directly on any order.
-- 4. expire_stale_pending_orders(): WhatsApp orders get at least 7 days before they are auto-cancelled,
--    since a chat can take longer than a card payment.
-- Idempotent: safe to re-run.

-- =============================================================================
-- 1) Channel
-- =============================================================================
alter table public.orders
  add column if not exists channel text not null default 'paystack';
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'orders_channel_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_channel_check check (channel in ('paystack','whatsapp'));
  end if;
end $$;

-- =============================================================================
-- 2) create_whatsapp_order — same arguments as create_order minus payment mode / key ref.
-- =============================================================================
create or replace function public.create_whatsapp_order(
  p_site uuid, p_reference text, p_customer_name text, p_customer_email text, p_customer_phone text,
  p_delivery_method text, p_delivery_address text, p_notes text,
  p_subtotal_kobo bigint, p_delivery_kobo bigint, p_total_kobo bigint, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := public.create_order(p_site, p_reference, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''),
    coalesce(p_customer_phone, ''), p_delivery_method, p_delivery_address, p_notes,
    p_subtotal_kobo, p_delivery_kobo, p_total_kobo, null, null, p_items);
  update public.orders set channel = 'whatsapp' where id = v_id;
  return v_id;
end $$;
revoke all on function public.create_whatsapp_order(uuid, text, text, text, text, text, text, text, bigint, bigint, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_whatsapp_order(uuid, text, text, text, text, text, text, text, bigint, bigint, bigint, jsonb)
  to service_role;

-- =============================================================================
-- 3) complete_whatsapp_order — any member of the order's site (owner, staff) or a Sulvatech admin.
-- Returns 'paid' | 'already_completed' | 'not_pending' (e.g. cancelled), or mark_order_paid's result.
-- =============================================================================
create or replace function public.complete_whatsapp_order(p_order uuid)
returns text language plpgsql security definer set search_path = public, auth as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or not public.is_site_member(o.site_id) then
    raise exception 'Order not found.' using errcode = '42501';
  end if;
  if o.channel <> 'whatsapp' then
    raise exception 'Only WhatsApp orders can be completed by hand.' using errcode = '42501';
  end if;
  if o.status in ('paid','fulfilled') then return 'already_completed'; end if;
  if o.status <> 'pending' then return 'not_pending'; end if;
  return public.mark_order_paid(o.id, o.reference, o.total_kobo);
end $$;
revoke all on function public.complete_whatsapp_order(uuid) from public, anon;
grant execute on function public.complete_whatsapp_order(uuid) to authenticated, service_role;

-- =============================================================================
-- 4) Stale pending orders: WhatsApp orders wait at least 7 days.
-- =============================================================================
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
      and created_at < now() - make_interval(hours => case when channel = 'whatsapp' then greatest(p_hours, 168) else p_hours end)
    for update skip locked
  )
  update public.orders o set status = 'cancelled' from stale where o.id = stale.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_stale_pending_orders(integer) from public, anon, authenticated;
grant execute on function public.expire_stale_pending_orders(integer) to service_role;
