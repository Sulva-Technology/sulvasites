-- DISABLE_RLS.sql
-- ⚠️ WARNING: This removes all Row Level Security policies
-- ⚠️ Only use in development! This makes your database accessible to anyone with credentials.
-- ⚠️ DO NOT use in production!

-- Drop all existing RLS policies
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'admin_users',
        'sites',
        'business_profiles',
        'pages',
        'extra_pages',
        'domains',
        'assets'
      )
  loop
    execute format('drop policy if exists %I on %I.%I;', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

-- Disable RLS on all tables
alter table public.admin_users disable row level security;
alter table public.sites disable row level security;
alter table public.business_profiles disable row level security;
alter table public.pages disable row level security;
alter table public.extra_pages disable row level security;
alter table public.domains disable row level security;
alter table public.assets disable row level security;

-- Verify RLS is disabled
select 
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
    'admin_users',
    'sites',
    'business_profiles',
    'pages',
    'extra_pages',
    'domains',
    'assets'
  )
order by tablename;

-- Expected output: all tables should show rls_enabled = false
