-- fix_storage_rls.sql
-- Policies for the site-assets bucket:
--   * anyone can read (logos/images are shown on public sites)
--   * only admins (public.is_admin()) can upload, update, or delete
-- Requires public.is_admin() from supabase/schema.sql.
-- Run this in Supabase SQL Editor.

-- Drop older / permissive policies for site-assets (if they exist)
DROP POLICY IF EXISTS "Allow authenticated users full access to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Admin-only writes
CREATE POLICY "Admins manage site-assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'site-assets' AND public.is_admin())
WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

-- Public read
CREATE POLICY "Allow public read access to site-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-assets');

-- Verify the policies were created
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%site-assets%'
ORDER BY policyname;
