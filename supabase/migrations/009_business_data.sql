-- 009_business_data.sql — run once in Supabase SQL Editor (after schema.sql, 001-008).
-- Back-office part 3: per-template business data (menu, timetable, doctors, services, programmes,
-- packages, projects/properties) in ONE generic table. Templates render it by merging active rows
-- into their existing services / team / use_cases / gallery sections (src/lib/businessData/merge.ts).
-- Depends on 005/007 helpers: public.is_site_member / is_admin (must_change_password gate lives in site_role()).
-- Idempotent: create if not exists, drop policy/trigger if exists, create or replace function.
--
-- Access model
--   select : anon + authenticated see ACTIVE items of PUBLISHED sites; members (owner, staff) and admins see all
--            items of their site (including inactive, i.e. "sold out" / "hidden").
--   write  : insert / update / delete for site members (owner AND staff, per the owner-accounts spec: staff run
--            the business tabs) and admins. Gated by must_change_password through site_role().
--   service_role bypasses RLS (ops, imports).
-- Money is integer kobo (bigint). Item shape is enforced per kind by business_item_data_ok().

-- =============================================================================
-- 1) SHAPE CHECK FUNCTIONS (immutable; used by a CHECK constraint)
-- =============================================================================

-- Absent key, or a string no longer than maxlen.
create or replace function public.business_text_ok(d jsonb, k text, maxlen int)
returns boolean language sql immutable as $$
  select not (d ? k) or (jsonb_typeof(d -> k) = 'string' and char_length(d ->> k) <= maxlen);
$$;

-- Absent key, or an https URL (no whitespace / angle brackets / quotes), max 600 chars.
create or replace function public.business_url_ok(d jsonb, k text)
returns boolean language sql immutable as $$
  select not (d ? k) or (
    jsonb_typeof(d -> k) = 'string'
    and char_length(d ->> k) <= 600
    and (d ->> k) ~ '^https://[^[:space:]<>"]+$'
  );
$$;

-- Absent key, or one of the allowed strings.
create or replace function public.business_enum_ok(d jsonb, k text, allowed text[])
returns boolean language sql immutable as $$
  select not (d ? k) or (jsonb_typeof(d -> k) = 'string' and (d ->> k) = any (allowed));
$$;

-- Absent key, or an array (max maxn) of allowed strings.
create or replace function public.business_enum_array_ok(d jsonb, k text, allowed text[], maxn int)
returns boolean language sql immutable as $$
  select not (d ? k) or (
    jsonb_typeof(d -> k) = 'array'
    and jsonb_array_length(d -> k) <= maxn
    and not exists (
      select 1 from jsonb_array_elements(d -> k) e
      where jsonb_typeof(e) <> 'string' or (e #>> '{}') <> all (allowed)
    )
  );
$$;

-- Absent key, or an array (max maxn) of https URLs.
create or replace function public.business_url_array_ok(d jsonb, k text, maxn int)
returns boolean language sql immutable as $$
  select not (d ? k) or (
    jsonb_typeof(d -> k) = 'array'
    and jsonb_array_length(d -> k) <= maxn
    and not exists (
      select 1 from jsonb_array_elements(d -> k) e
      where jsonb_typeof(e) <> 'string'
         or char_length(e #>> '{}') > 600
         or (e #>> '{}') !~ '^https://[^[:space:]<>"]+$'
    )
  );
$$;

-- Absent key, or 'HH:MM' (24h).
create or replace function public.business_time_ok(d jsonb, k text)
returns boolean language sql immutable as $$
  select not (d ? k) or (
    jsonb_typeof(d -> k) = 'string' and (d ->> k) ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );
$$;

-- Per-kind shape of business_items.data: only known keys, right types, length caps.
create or replace function public.business_item_data_ok(p_kind text, d jsonb)
returns boolean language plpgsql immutable as $$
declare
  allowed text[];
begin
  if d is null or jsonb_typeof(d) <> 'object' or pg_column_size(d) > 8192 then return false; end if;

  allowed := case p_kind
    when 'menu_item'      then array['category','description','photo','dietary']
    when 'timetable_slot' then array['day','start','end','instructor','description']
    when 'doctor'         then array['specialty','bio','photo']
    when 'service'        then array['description','duration']
    when 'programme'      then array['duration','description']
    when 'package'        then array['duration','description']
    when 'project'        then array['location','status','description','photos']
    else null
  end;
  if allowed is null then return false; end if;
  if exists (select 1 from jsonb_object_keys(d) k where k <> all (allowed)) then return false; end if;

  return case p_kind
    when 'menu_item' then
      public.business_text_ok(d, 'category', 60)
      and public.business_text_ok(d, 'description', 500)
      and public.business_url_ok(d, 'photo')
      and public.business_enum_array_ok(d, 'dietary',
            array['vegetarian','vegan','halal','gluten_free','spicy','contains_nuts'], 6)
    when 'timetable_slot' then
      public.business_enum_ok(d, 'day', array['mon','tue','wed','thu','fri','sat','sun'])
      and public.business_time_ok(d, 'start')
      and public.business_time_ok(d, 'end')
      and (not (d ? 'start' and d ? 'end') or (d ->> 'end') > (d ->> 'start'))
      and public.business_text_ok(d, 'instructor', 80)
      and public.business_text_ok(d, 'description', 300)
    when 'doctor' then
      public.business_text_ok(d, 'specialty', 100)
      and public.business_text_ok(d, 'bio', 800)
      and public.business_url_ok(d, 'photo')
    when 'service' then
      public.business_text_ok(d, 'description', 500)
      and public.business_text_ok(d, 'duration', 60)
    when 'programme' then
      public.business_text_ok(d, 'duration', 60)
      and public.business_text_ok(d, 'description', 600)
    when 'package' then
      public.business_text_ok(d, 'duration', 60)
      and public.business_text_ok(d, 'description', 600)
    when 'project' then
      public.business_text_ok(d, 'location', 120)
      and public.business_enum_ok(d, 'status',
            array['planned','ongoing','completed','available','under_offer','sold'])
      and public.business_text_ok(d, 'description', 600)
      and public.business_url_array_ok(d, 'photos', 6)
    else false
  end;
end $$;

-- =============================================================================
-- 2) TABLE
-- =============================================================================

create table if not exists public.business_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  kind text not null check (kind in
    ('menu_item','timetable_slot','doctor','service','programme','package','project')),
  position integer not null default 0 check (position between 0 and 100000),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  price_kobo bigint null check (price_kobo is null or price_kobo between 0 and 1000000000000),
  data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_items_data_shape check (public.business_item_data_ok(kind, data)),
  constraint business_items_no_price_on_timetable check (kind <> 'timetable_slot' or price_kobo is null)
);
create index if not exists business_items_site_kind_pos_idx on public.business_items (site_id, kind, position);
create index if not exists business_items_site_active_idx on public.business_items (site_id) where active;

-- =============================================================================
-- 3) GRANTS + RLS
-- =============================================================================

alter table public.business_items enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated: start from nothing.
revoke all on table public.business_items from anon, authenticated;
grant all on table public.business_items to service_role;
grant select on public.business_items to anon;
grant select, insert, update, delete on public.business_items to authenticated;

-- Public: active items of published sites.
drop policy if exists public_read on public.business_items;
create policy public_read on public.business_items for select to anon, authenticated
  using (
    active
    and exists (select 1 from public.sites s
                where s.id = business_items.site_id and s.status = 'published'::public.site_status)
  );

-- Members and admins: everything on their site (inactive too).
drop policy if exists members_read on public.business_items;
create policy members_read on public.business_items for select to authenticated
  using (public.is_site_member(site_id));

drop policy if exists members_insert on public.business_items;
create policy members_insert on public.business_items for insert to authenticated
  with check (public.is_site_member(site_id));

drop policy if exists members_update on public.business_items;
create policy members_update on public.business_items for update to authenticated
  using (public.is_site_member(site_id)) with check (public.is_site_member(site_id));

drop policy if exists members_delete on public.business_items;
create policy members_delete on public.business_items for delete to authenticated
  using (public.is_site_member(site_id));

-- =============================================================================
-- 4) GUARD TRIGGER
-- =============================================================================
-- Not SECURITY DEFINER (like 006/008): current_user is the invoking role, so service_role / postgres pass
-- through the immutability rule. The per-site cap applies to every role.
--   * site_id, kind, id and created_at never change on update from a client role (same-site integrity:
--     an item cannot be moved to another site or re-typed to dodge the per-kind shape).
--   * at most 500 items per site (anti-abuse; soft under concurrency).
--   * updated_at maintained.
create or replace function public.business_items_guard() returns trigger
language plpgsql set search_path = public, auth as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.business_items where site_id = new.site_id) >= 500 then
      raise exception 'A site can hold at most 500 business items.' using errcode = '54000';
    end if;
    new.created_at := now();
  elsif current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
       or new.site_id is distinct from old.site_id
       or new.kind is distinct from old.kind
       or new.created_at is distinct from old.created_at then
      raise exception 'An item''s site and type cannot be changed.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists business_items_guard on public.business_items;
create trigger business_items_guard before insert or update on public.business_items
  for each row execute function public.business_items_guard();
