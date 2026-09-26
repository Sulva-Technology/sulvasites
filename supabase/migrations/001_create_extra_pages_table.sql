-- Migration: Create extra_pages table
-- Run this in Supabase SQL Editor if the table doesn't exist

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

-- Indexes
create index if not exists extra_pages_site_id_idx on public.extra_pages (site_id);
create index if not exists extra_pages_site_id_key_idx on public.extra_pages (site_id, key);

-- Trigger for updated_at
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_extra_pages_set_updated_at') then
    create trigger trg_extra_pages_set_updated_at
    before update on public.extra_pages
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

-- Enable RLS
alter table public.extra_pages enable row level security;

-- Admin-only full access
create policy admin_full_access on public.extra_pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public read for published pages
create policy public_read_published_extra_pages on public.extra_pages
for select
to anon, authenticated
using (status = 'published'::public.publish_status);

-- Grants
grant select, insert, update, delete on public.extra_pages to authenticated;
grant select on public.extra_pages to anon;
