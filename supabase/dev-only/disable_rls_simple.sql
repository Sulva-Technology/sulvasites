-- SIMPLE VERSION - Just disable RLS (drops policies automatically)
-- Run this in Supabase SQL Editor

ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_users', 'sites', 'business_profiles', 'pages', 'extra_pages', 'domains', 'assets');
