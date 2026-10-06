-- 014_super_admin_only_guard_check.sql
-- Manual check for 014_super_admin_only_guard.sql. Paste into the Supabase SQL Editor (postgres role).
-- Runs in one transaction and is rolled back. Success: 'ALL CHECKS PASSED'. Failure raises 'FAIL: ...'.
begin;

create temp table _ids (super_id uuid, admin_id uuid, user_id uuid);
grant select on _ids to authenticated;
insert into _ids values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

create schema zz_chk;
grant usage on schema zz_chk to public;

create function zz_chk.expect_fail(p_sql text, p_label text)
returns void language plpgsql as $$
declare ok boolean := false; got_state text;
begin
  begin
    execute p_sql;
  exception when others then
    ok := true; got_state := sqlstate;
  end;
  if not ok then raise exception 'FAIL: % (statement succeeded, expected error)', p_label; end if;
  if got_state <> '42501' then raise exception 'FAIL: % (sqlstate %, expected 42501)', p_label, got_state; end if;
end $$;

insert into auth.users (id, email, aud, role)
select u.id, 'zz-' || u.tag || '-' || substr(u.id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated'
from _ids i, lateral (values (i.super_id, 'super'), (i.admin_id, 'admin'), (i.user_id, 'user')) as u(id, tag);

insert into public.admin_users (user_id, is_super)
select super_id, true from _ids union all select admin_id, false from _ids;

-- Simulate the hole: an old script re-run that lets every admin write admin_users.
drop policy if exists admin_full_access on public.admin_users;
create policy admin_full_access on public.admin_users for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Regular admin: every write to admin_users is refused, even with the permissive policy.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);
do $$
begin
  perform zz_chk.expect_fail('insert into public.admin_users (user_id) select user_id from _ids', 'admin creates an admin');
  perform zz_chk.expect_fail('insert into public.admin_users (user_id, is_super) select user_id, true from _ids', 'admin creates a super admin');
  perform zz_chk.expect_fail('update public.admin_users set is_super = true where user_id = (select admin_id from _ids)', 'admin promotes self');
  perform zz_chk.expect_fail('delete from public.admin_users where user_id = (select super_id from _ids)', 'admin removes a super admin');
end $$;
reset role;

-- Super admin: can still add an admin.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select super_id from _ids), 'role', 'authenticated')::text, true);
insert into public.admin_users (user_id) select user_id from _ids;
reset role;

do $$
begin
  if not exists (select 1 from public.admin_users where user_id = (select user_id from _ids)) then
    raise exception 'FAIL: super admin could not add an admin';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
