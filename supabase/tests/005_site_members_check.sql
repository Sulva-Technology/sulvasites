-- 005_site_members_check.sql
-- Manual RLS check for 005_site_members.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (owner_id uuid, staff_id uuid, outsider_id uuid, admin_id uuid, site_id uuid);
grant select on _ids to authenticated;

insert into _ids (owner_id, staff_id, outsider_id, admin_id, site_id)
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        (select user_id from public.admin_users limit 1), gen_random_uuid());

insert into auth.users (id, email, aud, role)
select owner_id,    'zz-owner-'    || substr(owner_id::text, 1, 8)    || '@example.test', 'authenticated', 'authenticated' from _ids
union all
select staff_id,    'zz-staff-'    || substr(staff_id::text, 1, 8)    || '@example.test', 'authenticated', 'authenticated' from _ids
union all
select outsider_id, 'zz-outsider-' || substr(outsider_id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated' from _ids;

-- handle_new_site trigger auto-creates business_profiles + home/about/contact pages.
insert into public.sites (id, slug, template_key)
select site_id, 'zz-rls-check-' || substr(gen_random_uuid()::text, 1, 8), 't1' from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all
select site_id, staff_id, 'staff' from _ids;

-- Sanity: seed rows exist (as postgres).
do $$
begin
  if (select count(*) from public.pages where site_id = (select site_id from _ids)) <> 3 then
    raise exception 'FAIL: setup - expected 3 auto-created pages';
  end if;
  if not exists (select 1 from public.business_profiles where site_id = (select site_id from _ids)) then
    raise exception 'FAIL: setup - expected auto-created business profile';
  end if;
end $$;

-- =============================================================================
-- OWNER
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare n int; sid uuid := (select site_id from _ids);
begin
  if (select count(*) from public.sites where id = sid) <> 1 then
    raise exception 'FAIL: owner cannot read own site';
  end if;

  update public.pages set data = '{"zz":1}'::jsonb where site_id = sid and key = 'home';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner page update affected % rows (expected 1)', n; end if;

  update public.business_profiles set business_name = 'ZZ Owner Edit' where site_id = sid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner profile update affected % rows (expected 1)', n; end if;

  -- forbidden: sites.slug
  begin
    update public.sites set slug = slug || '-x' where id = sid;
    raise exception 'FAIL: owner changed sites.slug without error';
  exception when others then
    if sqlerrm <> 'Only Sulvatech can change this setting.' then
      raise exception 'FAIL: owner slug update raised unexpected error: %', sqlerrm;
    end if;
  end;

  -- forbidden: sites.status
  begin
    update public.sites set status = 'published' where id = sid;
    raise exception 'FAIL: owner changed sites.status without error';
  exception when others then
    if sqlerrm <> 'Only Sulvatech can change this setting.' then
      raise exception 'FAIL: owner status update raised unexpected error: %', sqlerrm;
    end if;
  end;

  -- forbidden: business_profiles.theme_colors
  begin
    update public.business_profiles set theme_colors = '{"primary":"#000"}'::jsonb where site_id = sid;
    raise exception 'FAIL: owner changed theme_colors without error';
  exception when others then
    if sqlerrm <> 'Only Sulvatech can change this setting.' then
      raise exception 'FAIL: owner theme_colors update raised unexpected error: %', sqlerrm;
    end if;
  end;
end $$;
reset role;

-- =============================================================================
-- STAFF
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare n int; sid uuid := (select site_id from _ids);
begin
  if (select count(*) from public.sites where id = sid) <> 1 then
    raise exception 'FAIL: staff cannot read site';
  end if;
  if (select count(*) from public.pages where site_id = sid) <> 3 then
    raise exception 'FAIL: staff cannot read pages';
  end if;

  update public.pages set data = '{"zz":2}'::jsonb where site_id = sid and key = 'home';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: staff page update affected % rows (expected 0)', n; end if;

  update public.business_profiles set business_name = 'ZZ Staff Edit' where site_id = sid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: staff profile update affected % rows (expected 0)', n; end if;

  update public.sites set updated_at = now() where id = sid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: staff site update affected % rows (expected 0)', n; end if;
end $$;
reset role;

-- =============================================================================
-- OUTSIDER (authenticated, not a member; site is draft so public read does not apply)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare n int; sid uuid := (select site_id from _ids);
begin
  if (select count(*) from public.sites where id = sid) <> 0 then
    raise exception 'FAIL: outsider can read site';
  end if;
  if (select count(*) from public.pages where site_id = sid) <> 0 then
    raise exception 'FAIL: outsider can read pages';
  end if;
  if (select count(*) from public.business_profiles where site_id = sid) <> 0 then
    raise exception 'FAIL: outsider can read profile';
  end if;
  if (select count(*) from public.site_members where site_id = sid) <> 0 then
    raise exception 'FAIL: outsider can read site_members';
  end if;
  update public.pages set data = '{"zz":3}'::jsonb where site_id = sid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: outsider page update affected % rows (expected 0)', n; end if;
end $$;
reset role;

-- =============================================================================
-- ADMIN (uses an existing admin_users row; skipped with a NOTICE if none exists)
-- =============================================================================
do $$
begin
  if (select admin_id from _ids) is null then
    raise notice 'SKIPPED: admin path (no row in public.admin_users)';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);

do $$
declare n int; sid uuid := (select site_id from _ids);
begin
  if (select admin_id from _ids) is null then return; end if;
  if (select count(*) from public.sites where id = sid) <> 1 then
    raise exception 'FAIL: admin cannot read site';
  end if;
  update public.sites set slug = slug || '-adm' where id = sid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin slug update affected % rows (expected 1)', n; end if;
  update public.business_profiles set theme_colors = '{"primary":"#111"}'::jsonb where site_id = sid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin theme_colors update affected % rows (expected 1)', n; end if;
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
