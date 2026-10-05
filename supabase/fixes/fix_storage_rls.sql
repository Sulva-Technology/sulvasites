-- fix_storage_rls.sql
-- Policies for the site-assets bucket:
--   * anyone can read (logos/images are shown on public sites)
--   * writes go through the per-site "Owners manage own site-assets" policy (migration 005), which
--     allows a site's owners and its admin (migration 012: the admin who created it, or a super admin)
-- Run after the migrations.
-- Run this in Supabase SQL Editor.

-- Drop older / permissive policies for site-assets (if they exist)
DROP POLICY IF EXISTS "Allow authenticated users full access to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- No blanket admin write policy: it would let any admin change any site's files (see migration 012).

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
