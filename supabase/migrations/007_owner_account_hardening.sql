-- 007_owner_account_hardening.sql — run once in Supabase SQL Editor (after 005 and 006).
--
-- 1. must_change_password gate in RLS. Accounts created by Sulvatech start on a shared temporary
--    password and carry app_metadata.must_change_password = true. Until that flag is cleared the
--    account must not read or write any site data, even via a direct PostgREST call.
--    site_role() is the root of is_site_member() / can_edit_site() (migrations 005 + 006 only
--    ever call those three helpers), so gating site_role() gates every member policy.
--    Admins (is_admin) and service_role are unaffected.
--    NOTE: the flag is read from the JWT, so after change-password the client MUST refresh its
--    session (supabase.auth.refreshSession()) to receive a token without the flag.
-- 2. Atomic last-owner protection (trigger on site_members).
-- 3. find_user_id_by_email(): indexed lookup for the server routes (replaces listUsers scans).

create or replace function public.site_role(p_site uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select sm.role from public.site_members sm
  where sm.site_id = p_site and sm.user_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'must_change_password', '') <> 'true';
$$;
-- is_site_member / can_edit_site are re-created as in 005 (they inherit the gate via site_role).
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

-- Last-owner guard. Runs for every role (service_role included). A per-site advisory lock
-- serialises concurrent removals, and the owner check runs after the lock (new snapshot per
-- statement under READ COMMITTED), so two owners cannot remove each other at once.
-- Site deletion (cascade) is allowed: the site row is already gone inside that transaction.
create or replace function public.site_members_last_owner_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.role <> 'owner' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.role = 'owner' and new.site_id = old.site_id and new.user_id = old.user_id then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('site_members_owner:' || old.site_id::text));
  if not exists (select 1 from public.sites where id = old.site_id) then
    return coalesce(new, old);
  end if;
  if not exists (
    select 1 from public.site_members
    where site_id = old.site_id and role = 'owner' and user_id <> old.user_id
  ) then
    raise exception 'A site needs at least one owner.' using errcode = 'SM001';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists site_members_last_owner_guard on public.site_members;
create trigger site_members_last_owner_guard
  before delete or update of role, site_id, user_id on public.site_members
  for each row execute function public.site_members_last_owner_guard();

-- Server-only email -> user lookup (service_role only).
create or replace function public.find_user_id_by_email(p_email text)
returns table (user_id uuid, must_change_password boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.id, coalesce(u.raw_app_meta_data ->> 'must_change_password', '') = 'true'
  from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
