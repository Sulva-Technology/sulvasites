-- 018_whatsapp_checkout_mode.sql — run once in Supabase SQL Editor (after 006 and 015).
-- Lets the shop owner (or Sulvatech) choose how customers buy, from the shop's Payments tab.
--
-- 1. shop_settings.checkout_mode:
--      'card'              Paystack checkout only; no WhatsApp ordering buttons.
--      'card_and_whatsapp' Paystack checkout plus "Order on WhatsApp" (default: how shops behaved before).
--      'whatsapp'          WhatsApp ordering only; no Paystack needed. Card checkout is refused server-side.
-- 2. shop_settings.whatsapp_orders_number: the number orders go to. Null = the site's contact WhatsApp.
-- Both are owner-editable (owners_update policy); the shop_settings_owner_guard only protects payment fields.
-- Idempotent: safe to re-run.

alter table public.shop_settings
  add column if not exists checkout_mode text not null default 'card_and_whatsapp';
alter table public.shop_settings
  add column if not exists whatsapp_orders_number text null;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'shop_settings_checkout_mode_check' and conrelid = 'public.shop_settings'::regclass) then
    alter table public.shop_settings add constraint shop_settings_checkout_mode_check
      check (checkout_mode in ('card','card_and_whatsapp','whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint
                 where conname = 'shop_settings_whatsapp_orders_number_check' and conrelid = 'public.shop_settings'::regclass) then
    alter table public.shop_settings add constraint shop_settings_whatsapp_orders_number_check
      check (whatsapp_orders_number is null or whatsapp_orders_number ~ '^\+?[0-9]{7,15}$');
  end if;
end $$;
