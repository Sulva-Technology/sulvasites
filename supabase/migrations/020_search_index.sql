-- 020_search_index.sql — automated Google Search Console + IndexNow submission state.
-- Spec: docs/superpowers/specs/2026-10-09-search-engine-submission-design.md. Safe to re-run.
--
-- One row per submitted host: the platform domain (site_id null) and each published site's primary
-- host (oldest active custom domain, else its subdomain). Written only by the service role
-- (cron /api/cron/search, publish ping, admin Resubmit): RLS on, no policies.

create table if not exists public.site_search_index (
  id uuid primary key default gen_random_uuid(),
  site_id uuid null references public.sites(id) on delete cascade,
  host text not null unique,
  kind text not null check (kind in ('platform','subdomain','custom')),
  google_state text not null default 'pending'
    check (google_state in ('pending','token','verified','added','submitted')),
  google_state_at timestamptz not null default now(),
  google_token text null,                     -- META verification content (custom domains)
  sitemap_submitted_at timestamptz null,
  indexnow_pushed_at timestamptz null,
  failures int not null default 0,
  last_error text null,
  last_error_at timestamptz null,
  active boolean not null default true,       -- false once the host is no longer a published primary host
  checked_at timestamptz null,                -- last cron visit; the cron works oldest-first
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_search_index_active_checked on public.site_search_index (active, checked_at nulls first);
create index if not exists site_search_index_site on public.site_search_index (site_id);

alter table public.site_search_index enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_site_search_index_set_updated_at') then
    create trigger trg_site_search_index_set_updated_at
    before update on public.site_search_index
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
