-- Fix RLS for admin access (sites + related tables)
-- Goal: ensure authenticated admins (in public.admin_users) can write to public.sites
-- and prevent circular RLS dependencies when checking admin status.
--
-- Run this in Supabase SQL Editor.

-- 1) Ensure admin allowlist table exists
create table if not exists public.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- 2) Hardened is_admin() helper (used by RLS policies)
-- SECURITY DEFINER makes this robust even when RLS is enabled on admin_users.
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

-- 3) Enable RLS (safe to re-run)
alter table public.admin_users enable row level security;
alter table public.sites enable row level security;
alter table public.business_profiles enable row level security;
alter table public.pages enable row level security;
alter table public.extra_pages enable row level security;
alter table public.domains enable row level security;
alter table public.assets enable row level security;

-- 4) Drop and recreate policies (idempotent)
drop policy if exists admin_users_self_read on public.admin_users;
drop policy if exists admin_full_access on public.admin_users;
drop policy if exists admin_full_access on public.sites;
drop policy if exists admin_full_access on public.business_profiles;
drop policy if exists admin_full_access on public.pages;
drop policy if exists admin_full_access on public.extra_pages;
drop policy if exists admin_full_access on public.domains;
drop policy if exists admin_full_access on public.assets;

-- Non-circular policy: any authenticated user can see ONLY their own row.
-- This is useful for debugging and avoids any accidental circular dependencies.
create policy admin_users_self_read on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

-- Admin-only full access on all tables
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

-- 5) Quick sanity checks (optional)
-- select auth.uid() as current_user_id; -- works only inside Supabase authenticated context
-- select public.is_admin() as is_admin;

