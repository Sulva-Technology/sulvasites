-- DISABLE_STORAGE_RLS.sql
-- ⚠️ This disables RLS on the storage bucket for development
-- ⚠️ Only use in development! DO NOT use in production!

-- Drop all existing storage policies for site-assets bucket
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like '%site-assets%'
  loop
    execute format('drop policy if exists %I on storage.objects;', p.policyname);
  end loop;
end
$$;

-- Disable RLS on storage.objects (affects all buckets)
-- OR create a permissive policy for site-assets bucket

-- Option 1: Disable RLS entirely (simplest for dev)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policy for authenticated users (recommended)
-- This allows any authenticated user to upload/read/delete in site-assets bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated users full access to site-assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'site-assets')
WITH CHECK (bucket_id = 'site-assets');

-- Also allow public read access (since bucket should be public)
CREATE POLICY IF NOT EXISTS "Allow public read access to site-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-assets');

-- Verify policies
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%site-assets%';
