-- 008_inbox_check.sql
-- Manual RLS / grant check for 008_inbox.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid default gen_random_uuid(), staff_id uuid default gen_random_uuid(),
  outsider_id uuid default gen_random_uuid(), admin_id uuid default gen_random_uuid(),
  owner_b_id uuid default gen_random_uuid(), temp_pw_id uuid default gen_random_uuid(),
  site_id uuid default gen_random_uuid(),     -- A (owner, staff, temp_pw staff)
  site_b_id uuid default gen_random_uuid(),   -- B (owner_b)
  msg_a1 uuid default gen_random_uuid(), msg_a2 uuid default gen_random_uuid(),
  msg_a3 uuid default gen_random_uuid(), msg_b uuid default gen_random_uuid()
);
grant select on _ids to anon, authenticated;
insert into _ids default values;

create schema zz_chk;
grant usage on schema zz_chk to public;

create function zz_chk.expect_fail(p_sql text, p_label text, p_state text default null)
returns void language plpgsql as $$
declare ok boolean := false; got_state text; got_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    ok := true; got_state := sqlstate; got_msg := sqlerrm;
  end;
  if not ok then raise exception 'FAIL: % (statement succeeded, expected error)', p_label; end if;
  if p_state is not null and got_state <> p_state then
    raise exception 'FAIL: % (sqlstate %, expected %: %)', p_label, got_state, p_state, got_msg;
  end if;
end $$;

create function zz_chk.expect_rows(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_n then raise exception 'FAIL: % (affected % rows, expected %)', p_label, n, p_n; end if;
end $$;

create function zz_chk.expect_count(p_sql text, p_n int, p_label text)
returns void language plpgsql as $$
declare n int;
begin
  execute p_sql into n;
  if n <> p_n then raise exception 'FAIL: % (count %, expected %)', p_label, n, p_n; end if;
end $$;

create function zz_chk.expect_eq(p_sql text, p_expected text, p_label text)
returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  if v is distinct from p_expected then
    raise exception 'FAIL: % (got %, expected %)', p_label, coalesce(v, 'NULL'), coalesce(p_expected, 'NULL');
  end if;
end $$;

insert into auth.users (id, email, aud, role)
select u.id, 'zz-' || u.tag || '-' || substr(u.id::text, 1, 8) || '@example.test', 'authenticated', 'authenticated'
from _ids i, lateral (values
  (i.owner_id, 'owner'), (i.staff_id, 'staff'), (i.outsider_id, 'outsider'),
  (i.admin_id, 'admin'), (i.owner_b_id, 'ownerb'), (i.temp_pw_id, 'temppw')) as u(id, tag);
insert into public.admin_users (user_id) select admin_id from _ids;

insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-inbox-a-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids
union all
select site_b_id, 'zz-inbox-b-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'published'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_id, temp_pw_id, 'staff' from _ids
union all select site_b_id, owner_b_id, 'owner' from _ids;

insert into public.inbox_messages (id, site_id, kind, name, email, phone, message, extra)
select msg_a1, site_id,   'enquiry', 'Ada', 'ada@example.test', null, 'Hello', '{}'::jsonb from _ids
union all select msg_a2, site_id,   'booking', 'Bo', null, '08012345678', '', '{"date":"2026-11-01","guests":"4"}'::jsonb from _ids
union all select msg_a3, site_id,   'enquiry', 'Cy', 'cy@example.test', null, 'Hi', '{}'::jsonb from _ids
union all select msg_b,  site_b_id, 'enquiry', 'Di', 'di@example.test', null, 'Hey', '{}'::jsonb from _ids;

-- =============================================================================
-- postgres: structural facts
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 3, 'setup: 3 messages on site A');
  perform zz_chk.expect_count($q$select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relname = 'inbox_messages'$q$, 1, 'RLS enabled on inbox_messages');
  perform zz_chk.expect_eq($q$select has_table_privilege('anon', 'public.inbox_messages', 'select,insert,update,delete')::text$q$, 'false', 'anon has no table privileges');
  perform zz_chk.expect_eq($q$select has_any_column_privilege('anon', 'public.inbox_messages', 'select,insert,update')::text$q$, 'false', 'anon has no column privileges');
  perform zz_chk.expect_eq($q$select has_table_privilege('authenticated', 'public.inbox_messages', 'insert')::text$q$, 'false', 'authenticated cannot insert');
  perform zz_chk.expect_eq($q$select has_table_privilege('authenticated', 'public.inbox_messages', 'update')::text$q$, 'false', 'authenticated has no table-level update');
  perform zz_chk.expect_eq($q$select has_column_privilege('authenticated', 'public.inbox_messages', 'status', 'update')::text$q$, 'true', 'authenticated can update status');
  perform zz_chk.expect_eq($q$select (has_column_privilege('authenticated', 'public.inbox_messages', 'email', 'update')
    or has_column_privilege('authenticated', 'public.inbox_messages', 'message', 'update')
    or has_column_privilege('authenticated', 'public.inbox_messages', 'site_id', 'update'))::text$q$, 'false', 'authenticated cannot update other columns');
  perform zz_chk.expect_count($q$select count(*) from pg_policies where schemaname = 'public' and tablename = 'inbox_messages' and cmd = 'INSERT'$q$, 0, 'no insert policy');

  -- table constraints (postgres bypasses RLS, constraints still apply)
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, message) values (%L, 'enquiry', 'x', 'no contact')$q$, a), 'contact (email or phone) required', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, email) values (%L, 'spam', 'x', 'x@example.test')$q$, a), 'kind check', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, email, status) values (%L, 'enquiry', 'x', 'x@example.test', 'done')$q$, a), 'status check', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, email, extra) values (%L, 'enquiry', 'x', 'x@example.test', '[1]'::jsonb)$q$, a), 'extra must be object', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, email, message) values (%L, 'enquiry', 'x', 'x@example.test', repeat('a', 4001))$q$, a), 'message length cap', '23514');
end $$;

-- =============================================================================
-- OWNER (site A)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 3, 'owner reads site A messages');
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', b), 0, 'owner cannot read site B messages');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'read' where id = %L$q$, (select msg_a1 from _ids)), 1, 'owner marks read');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'replied' where id = %L$q$, (select msg_a1 from _ids)), 1, 'owner marks replied');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'new' where id = %L$q$, (select msg_a1 from _ids)), 1, 'owner can mark unread again');
  perform zz_chk.expect_fail(format($q$update public.inbox_messages set message = 'edited' where id = %L$q$, (select msg_a1 from _ids)), 'owner cannot edit message', '42501');
  perform zz_chk.expect_fail(format($q$update public.inbox_messages set site_id = %L where id = %L$q$, b, (select msg_a1 from _ids)), 'owner cannot move message to another site', '42501');
  perform zz_chk.expect_fail(format($q$update public.inbox_messages set status = 'bogus' where id = %L$q$, (select msg_a1 from _ids)), 'invalid status rejected', '23514');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'read' where id = %L$q$, (select msg_b from _ids)), 0, 'owner cannot update site B message');
  perform zz_chk.expect_fail(format($q$insert into public.inbox_messages (site_id, kind, name, email) values (%L, 'enquiry', 'x', 'x@example.test')$q$, a), 'owner cannot insert', '42501');
  perform zz_chk.expect_rows(format($q$delete from public.inbox_messages where id = %L$q$, (select msg_a3 from _ids)), 0, 'owner delete matches 0 rows (admin-only policy)');
end $$;
reset role;

-- Confirm the row survived the owner delete attempt.
select zz_chk.expect_count(format('select count(*) from public.inbox_messages where id = %L', (select msg_a3 from _ids)), 1, 'message survives owner delete attempt');

-- =============================================================================
-- STAFF (site A): same read + status access
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 3, 'staff reads site A messages');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'archived' where id = %L$q$, (select msg_a2 from _ids)), 1, 'staff archives');
  perform zz_chk.expect_fail(format($q$update public.inbox_messages set name = 'x' where id = %L$q$, (select msg_a2 from _ids)), 'staff cannot edit name', '42501');
end $$;
reset role;

-- =============================================================================
-- OUTSIDER (authenticated, not a member): nothing
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 0, 'outsider reads nothing');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'read' where site_id = %L$q$, a), 0, 'outsider updates nothing');
end $$;
reset role;

-- =============================================================================
-- MUST-CHANGE-PASSWORD member (007 gate): nothing until the flag is cleared
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', true))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 0, 'must_change_password member reads nothing');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'read' where site_id = %L$q$, a), 0, 'must_change_password member updates nothing');
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select temp_pw_id from _ids), 'role', 'authenticated',
  'app_metadata', json_build_object('must_change_password', false))::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id = %L', a), 3, 'member reads after flag cleared');
end $$;
reset role;

-- =============================================================================
-- ANON: no access
-- =============================================================================
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
do $$
begin
  perform zz_chk.expect_fail('select count(*) from public.inbox_messages', 'anon cannot select', '42501');
  perform zz_chk.expect_fail($q$insert into public.inbox_messages (site_id, kind, name, email) values (gen_random_uuid(), 'enquiry', 'x', 'x@example.test')$q$, 'anon cannot insert', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN: reads all, status update, delete
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); b uuid := (select site_b_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.inbox_messages where site_id in (%L, %L)', a, b), 4, 'admin reads all');
  perform zz_chk.expect_rows(format($q$update public.inbox_messages set status = 'read' where id = %L$q$, (select msg_b from _ids)), 1, 'admin updates any status');
  perform zz_chk.expect_rows(format($q$delete from public.inbox_messages where id = %L$q$, (select msg_a3 from _ids)), 1, 'admin deletes');
end $$;
reset role;

-- =============================================================================
-- SERVICE ROLE: insert + notified_at (guard passthrough)
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'set local role service_role';
    perform zz_chk.expect_rows(format($q$insert into public.inbox_messages (site_id, kind, name, email, message) values (%L, 'enquiry', 'Svc', 'svc@example.test', 'via api')$q$, a), 1, 'service_role inserts');
    perform zz_chk.expect_rows(format($q$update public.inbox_messages set notified_at = now() where site_id = %L and name = 'Svc'$q$, a), 1, 'service_role sets notified_at');
    execute 'reset role';
  else
    raise notice 'SKIPPED: service_role path (role does not exist)';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
