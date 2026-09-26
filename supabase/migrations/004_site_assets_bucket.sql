-- Create site-assets bucket and policies for public images
-- Requires public.is_admin() from supabase/schema.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins manage site-assets" on storage.objects;
drop policy if exists "Allow public read access to site-assets" on storage.objects;
drop policy if exists "Allow authenticated users full access to site-assets" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Access" on storage.objects;

create policy "Admins manage site-assets" on storage.objects
for all to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

create policy "Allow public read access to site-assets" on storage.objects
for select to public
using (bucket_id = 'site-assets');

-- Verify the policies were created
-- NOTE: no ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY here — that can fail
-- on hosted Supabase (insufficient privilege). Confirm RLS is enabled on storage.objects
-- separately in the Supabase Dashboard (Database > Tables > storage.objects) if unsure.
select
  policyname,
  cmd as command,
  roles,
  qual as using_expression
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname ilike '%site-assets%'
order by policyname;
