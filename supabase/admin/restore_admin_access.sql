-- restore_admin_access.sql — run in Supabase SQL Editor when you're locked out of /admin
-- or a site shows "You don't have access to this site" / "No access".
--
-- Put your login email on the line marked "YOUR EMAIL" and run the whole script.
-- It is safe to run more than once, and works whether or not migration 012 is installed.
--
-- What it does for that email:
--   1. adds it to admin_users (fixes "Admin access required")
--   2. makes it a super admin if 012 is installed (super admins see every site + the Users page)
--   3. prints the result so you can confirm

begin;

do $$
declare
  my_email constant text := 'CHANGE-ME@example.com';  -- YOUR EMAIL
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(my_email));
  if uid is null then
    raise exception 'No login found for %. Check the email under Authentication → Users.', my_email;
  end if;

  insert into public.admin_users (user_id) values (uid) on conflict (user_id) do nothing;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'admin_users' and column_name = 'is_super') then
    execute 'update public.admin_users set is_super = true where user_id = $1' using uid;
  end if;
end $$;

commit;

-- Confirm: your row should show is_admin = true (and is_super = true after 012).
select u.email, (au.user_id is not null) as is_admin, to_jsonb(au) -> 'is_super' as is_super
from auth.users u
left join public.admin_users au on au.user_id = u.id
order by u.created_at desc
limit 10;

-- OPTIONAL (after 012): give a regular admin ownership of sites made before 012 (created_by is null),
-- so they can open them without being a super admin. Uncomment, set the email, and run:
-- update public.sites
--    set created_by = (select id from auth.users where lower(email) = lower('admin@example.com'))
--  where created_by is null;
