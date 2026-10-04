-- 005_site_members.sql — run once in Supabase SQL Editor (after schema.sql, 001-004).
create table if not exists public.site_members (
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (site_id, user_id)
);
create index if not exists site_members_user_idx on public.site_members(user_id);
alter table public.site_members enable row level security;
grant select, insert, update, delete on public.site_members to authenticated;

create or replace function public.site_role(p_site uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select sm.role from public.site_members sm where sm.site_id = p_site and sm.user_id = auth.uid();
$$;
create or replace function public.is_site_member(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_admin() or public.site_role(p_site) is not null;
$$;
create or replace function public.can_edit_site(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_admin() or public.site_role(p_site) = 'owner';
$$;
revoke execute on function public.site_role(uuid), public.is_site_member(uuid), public.can_edit_site(uuid) from public, anon;
grant execute on function public.site_role(uuid), public.is_site_member(uuid), public.can_edit_site(uuid) to authenticated;

-- site_members: members can see their site's team; writes are admin-only from the client (server routes use the service role).
drop policy if exists site_members_read on public.site_members;
create policy site_members_read on public.site_members for select to authenticated using (public.is_site_member(site_id));
drop policy if exists site_members_admin_write on public.site_members;
create policy site_members_admin_write on public.site_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- sites
drop policy if exists members_read_sites on public.sites;
create policy members_read_sites on public.sites for select to authenticated using (public.is_site_member(id));
drop policy if exists owners_update_sites on public.sites;
create policy owners_update_sites on public.sites for update to authenticated
  using (public.can_edit_site(id)) with check (public.can_edit_site(id));

-- content tables
-- business_profiles / pages: owners may only UPDATE (no insert/delete) so guards cannot be bypassed
-- and core pages cannot be removed. extra_pages: full write.
do $$
declare t text;
begin
  foreach t in array array['business_profiles','pages','extra_pages'] loop
    execute format('drop policy if exists members_read on public.%I', t);
    execute format('create policy members_read on public.%I for select to authenticated using (public.is_site_member(site_id))', t);
  end loop;
  foreach t in array array['business_profiles','pages'] loop
    execute format('drop policy if exists owners_write on public.%I', t);
    execute format('drop policy if exists owners_update on public.%I', t);
    execute format('create policy owners_update on public.%I for update to authenticated using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id))', t);
  end loop;
end $$;
drop policy if exists owners_write on public.extra_pages;
create policy owners_write on public.extra_pages for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- assets
drop policy if exists owners_assets on public.assets;
create policy owners_assets on public.assets for all to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

-- storage: owners write under <siteId>/ of sites they can edit
drop policy if exists "Owners manage own site-assets" on storage.objects;
create policy "Owners manage own site-assets" on storage.objects for all to authenticated
  using (bucket_id = 'site-assets' and public.can_edit_site(case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid end))
  with check (bucket_id = 'site-assets' and public.can_edit_site(case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid end));

-- guards: Sulvatech-only fields. Not SECURITY DEFINER: current_user is the invoking role, so
-- service_role / postgres writes pass through; only client roles (authenticated/anon) are restricted.
create or replace function public.sites_owner_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin()
     and (new.template_key is distinct from old.template_key
          or new.slug is distinct from old.slug or new.status is distinct from old.status) then
    raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists sites_owner_guard on public.sites;
create trigger sites_owner_guard before update on public.sites for each row execute function public.sites_owner_guard();

create or replace function public.profiles_owner_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.theme_colors is not null or new.brand_colors is not null then
        raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
      end if;
    elsif new.theme_colors is distinct from old.theme_colors
       or new.brand_colors is distinct from old.brand_colors then
      raise exception 'Only Sulvatech can change this setting.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_owner_guard on public.business_profiles;
create trigger profiles_owner_guard before insert or update on public.business_profiles for each row execute function public.profiles_owner_guard();
