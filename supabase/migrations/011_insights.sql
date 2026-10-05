-- 011_insights.sql — run once in Supabase SQL Editor (after schema.sql, 001-009; needs 006 commerce and 008 inbox).
-- Back-office part 4: privacy-friendly site analytics ("Insights").
-- (010 is reserved by the commerce hardening work; this file does not depend on it.)
-- Depends on 005/007 helpers: public.can_edit_site / is_admin (must_change_password gate lives in site_role()).
-- Idempotent: create if not exists, create or replace function.
--
-- Privacy model
--   * No cookies, no raw IP, no raw user agent. `visitor` is a daily-rotating salted hash computed by the
--     beacon route (sha256(secret | UTC day | site | ip | ua), 32 hex chars). Because the day is part of the
--     hash, the same person gets a different id every day, so "visitors" for a period is the sum of daily
--     unique visitors. `referrer_host` is a bare host (no path, no query). `country` is optional, 2 letters.
--   * Do-Not-Track / Global Privacy Control and bots are dropped before anything is stored (route).
--
-- Access model
--   insert : service_role only (public beacon route). No client grant, no policy.
--   select : NO direct client access (anon/authenticated have no privileges, RLS on with no policies).
--            Owners and Sulvatech admins read aggregates through public.insights_overview(site, days),
--            SECURITY DEFINER, gated by public.can_edit_site() (owner or admin; staff are excluded).
--   purge  : public.purge_page_views() deletes rows older than 90 days. service_role only.
--
-- RETENTION (cron-friendly). Schedule once, e.g. with pg_cron (Database > Extensions > pg_cron):
--   select cron.schedule('purge-page-views', '17 3 * * *', $$select public.purge_page_views()$$);
-- or call the function from any scheduler using the service role. Dashboard periods are 7/30/90 days, so
-- 90 days is the floor; "previous period" comparison is only shown where the data still exists (<= 45 days).

-- =============================================================================
-- 1) TABLE
-- =============================================================================
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 200 and left(path, 1) = '/'),
  referrer_host text null check (referrer_host is null or char_length(referrer_host) between 1 and 100),
  device text not null check (device in ('desktop','mobile','tablet')),
  country text null check (country is null or country ~ '^[A-Z]{2}$'),
  visitor text not null check (visitor ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);

create index if not exists page_views_site_created_idx on public.page_views (site_id, created_at desc);
create index if not exists page_views_created_idx on public.page_views (created_at);

alter table public.page_views enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated: start from nothing. No policies are created,
-- so even a stray grant would expose zero rows.
revoke all on table public.page_views from anon, authenticated;
grant all on table public.page_views to service_role;
grant usage, select on sequence public.page_views_id_seq to service_role;

-- =============================================================================
-- 2) AGGREGATES
-- =============================================================================
-- Day buckets use Africa/Lagos (fixed UTC+1). p_days is 7, 30 or 90; the period is the last p_days calendar
-- days including today. Previous-period totals are 0 when the previous window would exceed retention.
create or replace function public.insights_overview(p_site uuid, p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_tz constant text := 'Africa/Lagos';
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_from date;
  v_from_ts timestamptz;
  v_prev_ts timestamptz;
  v_prev_ok boolean;
  v_views bigint; v_visitors bigint; v_prev_views bigint := 0; v_prev_visitors bigint := 0;
  v_daily jsonb; v_pages jsonb; v_refs jsonb; v_devices jsonb;
  v_orders bigint; v_revenue bigint; v_prev_orders bigint; v_prev_revenue bigint;
  v_shop_daily jsonb; v_products jsonb;
  v_enq bigint; v_book bigint; v_unread bigint;
begin
  if p_days is null or p_days not in (7, 30, 90) then
    raise exception 'Invalid period.' using errcode = '22023';
  end if;
  if p_site is null or not public.can_edit_site(p_site) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  v_from := v_today - (p_days - 1);
  v_from_ts := v_from::timestamp at time zone v_tz;
  v_prev_ts := (v_from - p_days)::timestamp at time zone v_tz;
  v_prev_ok := p_days * 2 <= 90;

  -- traffic totals
  select count(*), count(distinct visitor) into v_views, v_visitors
    from public.page_views where site_id = p_site and created_at >= v_from_ts;
  if v_prev_ok then
    select count(*), count(distinct visitor) into v_prev_views, v_prev_visitors
      from public.page_views where site_id = p_site and created_at >= v_prev_ts and created_at < v_from_ts;
  end if;

  -- daily series, gap-filled
  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0))
                            order by d.day), '[]'::jsonb)
    into v_daily
    from (select (v_from + i) as day from generate_series(0, p_days - 1) i) d
    left join (
      select (created_at at time zone v_tz)::date as day, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where site_id = p_site and created_at >= v_from_ts group by 1
    ) v on v.day = d.day;

  select coalesce(jsonb_agg(t order by (t->>'views')::bigint desc, t->>'path'), '[]'::jsonb) into v_pages
    from (
      select jsonb_build_object('path', path, 'views', count(*), 'visitors', count(distinct visitor)) as t
        from public.page_views where site_id = p_site and created_at >= v_from_ts
        group by path order by count(*) desc, path limit 10
    ) x;

  select coalesce(jsonb_agg(t order by (t->>'views')::bigint desc, t->>'host'), '[]'::jsonb) into v_refs
    from (
      select jsonb_build_object('host', referrer_host, 'views', count(*)) as t
        from public.page_views where site_id = p_site and created_at >= v_from_ts and referrer_host is not null
        group by referrer_host order by count(*) desc, referrer_host limit 10
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('device', device, 'views', n) order by n desc, device), '[]'::jsonb) into v_devices
    from (select device, count(*) as n from public.page_views where site_id = p_site and created_at >= v_from_ts group by device) x;

  -- shop: paid orders (paid or fulfilled), by paid_at. Money is bigint kobo.
  select count(*), coalesce(sum(total_kobo), 0) into v_orders, v_revenue
    from public.orders where site_id = p_site and status in ('paid','fulfilled') and paid_at >= v_from_ts;
  select count(*), coalesce(sum(total_kobo), 0) into v_prev_orders, v_prev_revenue
    from public.orders where site_id = p_site and status in ('paid','fulfilled') and paid_at >= v_prev_ts and paid_at < v_from_ts;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'orders', coalesce(o.orders, 0), 'revenue_kobo', coalesce(o.revenue, 0))
                            order by d.day), '[]'::jsonb)
    into v_shop_daily
    from (select (v_from + i) as day from generate_series(0, p_days - 1) i) d
    left join (
      select (paid_at at time zone v_tz)::date as day, count(*) as orders, sum(total_kobo) as revenue
        from public.orders where site_id = p_site and status in ('paid','fulfilled') and paid_at >= v_from_ts group by 1
    ) o on o.day = d.day;

  select coalesce(jsonb_agg(t order by (t->>'revenue_kobo')::bigint desc, t->>'name'), '[]'::jsonb) into v_products
    from (
      select jsonb_build_object('name', oi.name, 'quantity', sum(oi.quantity), 'revenue_kobo', sum(oi.line_total_kobo)) as t
        from public.order_items oi
        join public.orders o on o.id = oi.order_id and o.site_id = oi.site_id
        where o.site_id = p_site and o.status in ('paid','fulfilled') and o.paid_at >= v_from_ts
        group by oi.name order by sum(oi.line_total_kobo) desc, oi.name limit 5
    ) x;

  -- inbox
  select count(*) filter (where kind = 'enquiry'), count(*) filter (where kind = 'booking') into v_enq, v_book
    from public.inbox_messages where site_id = p_site and not is_spam and created_at >= v_from_ts;
  select count(*) into v_unread
    from public.inbox_messages where site_id = p_site and not is_spam and status = 'new';

  return jsonb_build_object(
    'days', p_days,
    'totals', jsonb_build_object('views', v_views, 'visitors', v_visitors,
                                 'prev_views', v_prev_views, 'prev_visitors', v_prev_visitors),
    'daily', v_daily,
    'top_pages', v_pages,
    'top_referrers', v_refs,
    'devices', v_devices,
    'shop', jsonb_build_object('orders', v_orders, 'revenue_kobo', v_revenue,
                               'prev_orders', v_prev_orders, 'prev_revenue_kobo', v_prev_revenue,
                               'daily', v_shop_daily, 'top_products', v_products),
    'inbox', jsonb_build_object('enquiries', v_enq, 'bookings', v_book, 'unread', v_unread)
  );
end $$;

revoke execute on function public.insights_overview(uuid, integer) from public, anon;
grant execute on function public.insights_overview(uuid, integer) to authenticated;

-- =============================================================================
-- 3) RETENTION
-- =============================================================================
-- Deletes page views older than p_keep_days (default 90, minimum 7). Returns the number of rows removed.
create or replace function public.purge_page_views(p_keep_days integer default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  if p_keep_days is null or p_keep_days < 7 then
    raise exception 'Retention must be at least 7 days.' using errcode = '22023';
  end if;
  with d as (
    delete from public.page_views where created_at < now() - make_interval(days => p_keep_days) returning 1
  ) select count(*) into n from d;
  return n;
end $$;

revoke execute on function public.purge_page_views(integer) from public, anon, authenticated;
grant execute on function public.purge_page_views(integer) to service_role;
