-- 012_admin_site_ownership.sql — run once in Supabase SQL Editor (after schema.sql, 001-011).
--
-- Admins only see and manage the sites they created. Super admins see every site and are the only
-- admins who can add or remove other admins.
--
--   sites.created_by        set automatically to the creating user on every client insert.
--   admin_users.is_super    super admin flag.
--   is_super_admin()        caller is a super admin.
--   is_site_admin(site)     caller is a super admin, or an admin who created that site.
--
-- is_site_member() / can_edit_site() now use is_site_admin() instead of is_admin(), so every policy
-- built on them (commerce, inbox, business data, insights, storage) follows automatically. The
-- remaining policies that used is_admin() directly are replaced below.
--
-- Sites created before this migration have created_by = null: only super admins can see them.
-- Hand one to a specific admin with:
--   update public.sites set created_by = (select id from auth.users where lower(email) = lower('admin@example.com'))
--   where slug = 'the-site-slug';
--
-- BEFORE RUNNING: put your own login email on the line marked "SUPER ADMIN EMAIL" below.
-- The whole script is one transaction and stops without changing anything if that email is not
-- an existing admin (and no super admin exists yet).

begin;

alter table public.admin_users add column if not exists is_super boolean not null default false;

do $$
declare
  super_email constant text := 'CHANGE-ME@example.com';  -- SUPER ADMIN EMAIL
  promoted int;
begin
  update public.admin_users au
     set is_super = true
    from auth.users u
   where u.id = au.user_id
     and lower(u.email) = lower(trim(super_email));
  get diagnostics promoted = row_count;

  if promoted = 0 and not exists (select 1 from public.admin_users where is_super) then
    raise exception 'No super admin: set the SUPER ADMIN EMAIL line in 012_admin_site_ownership.sql to an existing admin''s login email.';
  end if;
end $$;

-- =============================================================================
-- 1) Ownership column + stamping
-- =============================================================================
alter table public.sites add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists sites_created_by_idx on public.sites(created_by);

-- Client inserts always belong to the caller (cannot be spoofed). service_role / postgres may set it
-- explicitly. Only super admins may reassign a site from the client.
create or replace function public.sites_created_by_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from old.created_by and not public.is_super_admin() then
      raise exception 'Only a super admin can change who owns a site.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- =============================================================================
-- 2) Helpers
-- =============================================================================
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_super);
$$;

create or replace function public.is_site_admin(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_super_admin()
      or (public.is_admin()
          and exists (select 1 from public.sites s where s.id = p_site and s.created_by = auth.uid()));
$$;

revoke execute on function public.is_super_admin(), public.is_site_admin(uuid) from public, anon;
grant execute on function public.is_super_admin(), public.is_site_admin(uuid) to authenticated;

drop trigger if exists sites_created_by_guard on public.sites;
create trigger sites_created_by_guard before insert or update on public.sites
  for each row execute function public.sites_created_by_guard();

-- Same bodies as 007, with is_admin() narrowed to is_site_admin(p_site).
create or replace function public.is_site_member(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_site_admin(p_site) or public.site_role(p_site) is not null;
$$;
create or replace function public.can_edit_site(p_site uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_site_admin(p_site) or public.site_role(p_site) = 'owner';
$$;

-- =============================================================================
-- 3) Policies that used is_admin() directly
-- =============================================================================

-- sites: checked against the row itself (not via is_site_admin) so INSERT ... RETURNING sees the new row.
drop policy if exists admin_full_access on public.sites;
create policy admin_full_access on public.sites for all to authenticated
  using (public.is_super_admin() or (public.is_admin() and created_by = auth.uid()))
  with check (public.is_super_admin() or (public.is_admin() and created_by = auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['business_profiles','pages','extra_pages','domains','assets'] loop
    execute format('drop policy if exists admin_full_access on public.%I', t);
    execute format('create policy admin_full_access on public.%I for all to authenticated
      using (public.is_site_admin(site_id)) with check (public.is_site_admin(site_id))', t);
  end loop;
end $$;

drop policy if exists site_members_admin_write on public.site_members;
create policy site_members_admin_write on public.site_members for all to authenticated
  using (public.is_site_admin(site_id)) with check (public.is_site_admin(site_id));

drop policy if exists admin_delete on public.inbox_messages;
create policy admin_delete on public.inbox_messages for delete to authenticated
  using (public.is_site_admin(site_id));

-- Storage: the per-site "Owners manage own site-assets" policy (005) goes through can_edit_site(),
-- which now covers the site's admin. The blanket admin policy would let any admin touch any site's files.
drop policy if exists "Admins manage site-assets" on storage.objects;

-- admin_users: everyone reads their own row (admin_users_self_read); only super admins manage admins.
drop policy if exists admin_full_access on public.admin_users;
create policy admin_full_access on public.admin_users for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- A super admin cannot strip the last super admin (including themselves) from the client.
create or replace function public.admin_users_last_super_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if (tg_op = 'DELETE' and old.is_super) or (tg_op = 'UPDATE' and old.is_super and not new.is_super) then
    if not exists (select 1 from public.admin_users where is_super and user_id <> old.user_id) then
      raise exception 'At least one super admin must remain.' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists admin_users_last_super_guard on public.admin_users;
create trigger admin_users_last_super_guard before update or delete on public.admin_users
  for each row execute function public.admin_users_last_super_guard();

commit;
