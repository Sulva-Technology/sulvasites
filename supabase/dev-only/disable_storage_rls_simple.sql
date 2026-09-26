-- DISABLE_STORAGE_RLS_SIMPLE.sql
-- ⚠️ This completely disables RLS on storage (all buckets)
-- ⚠️ Only use in development! DO NOT use in production!

-- Drop all storage policies
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects;', p.policyname);
  end loop;
end
$$;

-- Disable RLS on storage.objects (all buckets)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Expected: rowsecurity = false
