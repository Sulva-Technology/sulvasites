-- supabase_schema.sql
-- Multi-tenant "Free Websites for 100 SMEs" (Phase 1)
-- Safe to rerun: uses IF NOT EXISTS / DO blocks / ON CONFLICT DO NOTHING.

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) ENUMS
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'site_status') then
    create type public.site_status as enum ('draft', 'published', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'page_key') then
    create type public.page_key as enum ('home', 'about', 'contact');
  end if;

  if not exists (select 1 from pg_type where typname = 'publish_status') then
    create type public.publish_status as enum ('draft', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'domain_status') then
    create type public.domain_status as enum ('pending', 'active', 'blocked');
  end if;
end
$$;

-- =============================================================================
-- 2) admin_users allowlist
-- =============================================================================
create table if not exists public.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 3) is_admin() helper
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- =============================================================================
-- 4) TABLES
-- =============================================================================
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  template_key text not null,
  status public.site_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_profiles (
  site_id uuid primary key references public.sites(id) on delete cascade,
  business_name text not null,
  tagline text null,
  description text null,
  address text null,
  phone text null,
  email text null,
  whatsapp text null,
  socials jsonb not null default '{}'::jsonb,
  theme_colors jsonb null,
  brand_colors jsonb null,
  logo_asset_id uuid null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  key public.page_key not null,
  status public.publish_status not null default 'draft',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  unique (site_id, key)
);

-- Extra pages (per-site, arbitrary keys) for single projects
-- Example keys: "services", "pricing", "blog", "terms"
create table if not exists public.extra_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  key text not null,
  status public.publish_status not null default 'draft',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  unique (site_id, key)
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null unique,
  status public.domain_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  path text not null,
  mime_type text null,
  size_bytes bigint null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Useful indexes (some are redundant with UNIQUE, but included per requirements)
create index if not exists pages_site_id_idx on public.pages (site_id);
create index if not exists extra_pages_site_id_idx on public.extra_pages (site_id);
create index if not exists extra_pages_site_id_key_idx on public.extra_pages (site_id, key);
create index if not exists domains_hostname_idx on public.domains (hostname);
create index if not exists assets_site_id_idx on public.assets (site_id);

-- =============================================================================
-- 5) TRIGGERS / FUNCTIONS
-- =============================================================================

-- A/B) Auto-update updated_at columns on UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_sites_set_updated_at') then
    create trigger trg_sites_set_updated_at
    before update on public.sites
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_pages_set_updated_at') then
    create trigger trg_pages_set_updated_at
    before update on public.pages
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_extra_pages_set_updated_at') then
    create trigger trg_extra_pages_set_updated_at
    before update on public.extra_pages
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_business_profiles_set_updated_at') then
    create trigger trg_business_profiles_set_updated_at
    before update on public.business_profiles
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

-- C) After INSERT on sites: create default business_profile + pages (idempotent)
create or replace function public.handle_new_site()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_profiles (site_id, business_name)
  values (new.id, new.slug)
  on conflict (site_id) do nothing;

  insert into public.pages (site_id, key)
  values
    (new.id, 'home'::public.page_key),
    (new.id, 'about'::public.page_key),
    (new.id, 'contact'::public.page_key)
  on conflict (site_id, key) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_sites_after_insert_seed') then
    create trigger trg_sites_after_insert_seed
    after insert on public.sites
    for each row
    execute function public.handle_new_site();
  end if;
end
$$;

-- =============================================================================
-- 6) RLS POLICIES
-- =============================================================================

alter table public.admin_users enable row level security;
alter table public.sites enable row level security;
alter table public.business_profiles enable row level security;
alter table public.pages enable row level security;
alter table public.extra_pages enable row level security;
alter table public.domains enable row level security;
alter table public.assets enable row level security;

-- Clean up prior policies safely (so reruns don't fail)
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('admin_users', 'sites', 'business_profiles', 'pages', 'domains', 'assets')
      and policyname in (
        'admin_full_access',
        'public_read_published_sites',
        'public_read_published_pages',
        'public_read_published_extra_pages',
        'public_read_active_domains',
        'public_read_profiles_for_published_sites'
      )
  loop
    execute format('drop policy if exists %I on %I.%I;', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

-- Admin-only full access on all tables
create policy admin_users_self_read on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy admin_full_access on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.sites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.business_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.extra_pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.domains
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_full_access on public.assets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- OPTIONAL public read (implemented)
create policy public_read_published_sites on public.sites
for select
to anon, authenticated
using (status = 'published'::public.site_status);

create policy public_read_published_pages on public.pages
for select
to anon, authenticated
using (status = 'published'::public.publish_status);

create policy public_read_published_extra_pages on public.extra_pages
for select
to anon, authenticated
using (status = 'published'::public.publish_status);

create policy public_read_active_domains on public.domains
for select
to anon, authenticated
using (status = 'active'::public.domain_status);

create policy public_read_profiles_for_published_sites on public.business_profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = business_profiles.site_id
      and s.status = 'published'::public.site_status
  )
);

-- Grants (so RLS can be the gatekeeper)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.admin_users,
  public.sites,
  public.business_profiles,
  public.pages,
  public.extra_pages,
  public.domains,
  public.assets
to authenticated;

grant select on
  public.sites,
  public.business_profiles,
  public.pages,
  public.extra_pages,
  public.domains
to anon;

-- =============================================================================
-- 7) Post-SQL instructions
-- =============================================================================
-- How to add yourself as an admin:
-- 1) Sign up in Supabase Auth.
-- 2) Get your user id (UUID) from auth.users (or from the Supabase dashboard).
-- 3) Run:
--    insert into public.admin_users (user_id) values ('<my-uuid>');
--
-- Quick test steps:
-- - As admin:
--   insert into public.sites (slug, template_key) values ('kings-bakery', 't1');
--   -- Confirm business_profiles + home/about/contact pages were auto-created:
--   select * from public.business_profiles where site_id = (select id from public.sites where slug = 'kings-bakery');
--   select key, status from public.pages where site_id = (select id from public.sites where slug = 'kings-bakery') order by key;
-- - As non-admin:
--   -- Confirm cannot write:
--   insert into public.sites (slug, template_key) values ('should-fail', 't1');
--   -- Confirm cannot read drafts; but can read published/active per public policies:
--   select * from public.sites; -- should return only published rows (if any)
