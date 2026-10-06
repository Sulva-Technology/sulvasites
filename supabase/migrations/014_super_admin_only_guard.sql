-- 014_super_admin_only_guard.sql — run once in Supabase SQL Editor (after 012).
-- Only super admins may add, change or remove admins — enforced by a trigger, not only by RLS.
--
-- Why: 012 made the admin_users write policy super-admin-only, but older scripts (schema.sql and
-- supabase/fixes/fix_rls_admin.sql) still define admin_full_access with is_admin(). Re-running either
-- would silently let ANY admin insert admin_users rows, i.e. create admins or promote themselves to
-- super admin. A trigger is not replaced by those scripts, so this holds whatever policies exist.
--
-- Client roles (authenticated/anon) must be a super admin. service_role / postgres (the
-- /api/admin/users route, which already requires a super admin, and the SQL editor) pass through.
-- Idempotent.

create or replace function public.admin_users_super_only_guard() returns trigger
language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_super_admin() then
    raise exception 'Only a super admin can add, change or remove admins.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists admin_users_super_only_guard on public.admin_users;
create trigger admin_users_super_only_guard before insert or update or delete on public.admin_users
  for each row execute function public.admin_users_super_only_guard();
