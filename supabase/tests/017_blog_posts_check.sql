-- 017_blog_posts_check.sql
-- Manual RLS / grant / guard check for 017_blog_posts.sql. Paste into the Supabase SQL Editor (postgres role).
-- Everything runs in one transaction and is rolled back; no data is left behind.
-- Success: final result row 'ALL CHECKS PASSED'. Any failure raises 'FAIL: ...'.
begin;

create temp table _ids (
  owner_id uuid default gen_random_uuid(), staff_id uuid default gen_random_uuid(),
  outsider_id uuid default gen_random_uuid(), admin_id uuid default gen_random_uuid(),
  site_id uuid default gen_random_uuid(),     -- A (published; owner, staff)
  site_d_id uuid default gen_random_uuid(),   -- D (draft; owner)
  live_post uuid default gen_random_uuid(), draft_post uuid default gen_random_uuid(),
  future_post uuid default gen_random_uuid(), hidden_site_post uuid default gen_random_uuid()
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
from _ids i, lateral (values (i.owner_id, 'owner'), (i.staff_id, 'staff'), (i.outsider_id, 'outsider'), (i.admin_id, 'admin')) as u(id, tag);
insert into public.admin_users (user_id, is_super) select admin_id, true from _ids;

insert into public.sites (id, slug, template_key, status)
select site_id,   'zz-blog-a-' || substr(gen_random_uuid()::text, 1, 8), 't17', 'published'::public.site_status from _ids
union all
select site_d_id, 'zz-blog-d-' || substr(gen_random_uuid()::text, 1, 8), 't1', 'draft'::public.site_status from _ids;

insert into public.site_members (site_id, user_id, role)
select site_id, owner_id, 'owner' from _ids
union all select site_id, staff_id, 'staff' from _ids
union all select site_d_id, owner_id, 'owner' from _ids;

insert into public.blog_posts (id, site_id, slug, title, body, status, published_at)
select live_post, site_id, 'live', 'Live post', '<p>' || repeat('word ', 660) || '</p>', 'published', now() - interval '1 day' from _ids
union all select draft_post, site_id, 'draft', 'Draft post', '<p>Draft</p>', 'draft', null from _ids
union all select future_post, site_id, 'future', 'Scheduled post', '<p>Soon</p>', 'published', now() + interval '7 days' from _ids
union all select hidden_site_post, site_d_id, 'hidden', 'Post on a draft site', '<p>x</p>', 'published', now() - interval '1 day' from _ids;

-- =============================================================================
-- postgres: structure, CHECKs and the guard trigger
-- =============================================================================
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count($q$select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relname = 'blog_posts'$q$, 1, 'RLS enabled on blog_posts');
  perform zz_chk.expect_eq($q$select has_table_privilege('anon', 'public.blog_posts', 'select')::text$q$, 'true', 'anon can select (RLS limits rows)');
  perform zz_chk.expect_eq($q$select has_table_privilege('anon', 'public.blog_posts', 'insert,update,delete')::text$q$, 'false', 'anon cannot write');
  perform zz_chk.expect_eq(format($q$select read_minutes::text from public.blog_posts where id = %L$q$, (select live_post from _ids)), '3', 'read_minutes from the body (660 words)');

  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'Bad Slug', 'x')$q$, a), 'slug format', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'tag', 'x')$q$, a), 'reserved slug tag', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'page', 'x')$q$, a), 'reserved slug page', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'live', 'dupe')$q$, a), 'slug unique per site', '23505');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'blank', '   ')$q$, a), 'title not blank', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title, cover_url) values (%L, 'cov', 'x', 'javascript:alert(1)')$q$, a), 'cover must be https', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title, tags) values (%L, 't9', 'x', array['a','b','c','d','e','f','g','h','i'])$q$, a), 'max 8 tags', '23514');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title, tags) values (%L, 'tblank', 'x', array['  '])$q$, a), 'blank tag rejected', '23514');

  perform zz_chk.expect_rows(format($q$insert into public.blog_posts (site_id, slug, title, status) values (%L, 'stamp', 'x', 'published')$q$, a), 1, 'publish without a date');
  perform zz_chk.expect_count(format($q$select count(*) from public.blog_posts where site_id = %L and slug = 'stamp' and published_at is not null$q$, a), 1, 'publishing stamps published_at');
end $$;

-- =============================================================================
-- ANON: published, already-dated posts of published sites only
-- =============================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare a uuid := (select site_id from _ids); d uuid := (select site_d_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', a), 2, 'anon sees live posts (live + stamp), not draft or scheduled');
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', d), 0, 'anon sees nothing on a draft site');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'anon', 'x')$q$, a), 'anon cannot insert', '42501');
end $$;
reset role;

-- =============================================================================
-- OWNER: reads drafts, writes own site, not others
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select owner_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids); d uuid := (select site_d_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', a), 4, 'owner sees drafts and scheduled');
  perform zz_chk.expect_rows(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'owner-new', 'Owner post')$q$, a), 1, 'owner inserts');
  perform zz_chk.expect_rows(format($q$update public.blog_posts set title = 'Edited' where id = %L$q$, (select draft_post from _ids)), 1, 'owner updates');
  perform zz_chk.expect_fail(format($q$update public.blog_posts set site_id = %L where id = %L$q$, d, (select draft_post from _ids)), 'post cannot move site', '42501');
  perform zz_chk.expect_rows(format($q$delete from public.blog_posts where slug = 'owner-new' and site_id = %L$q$, a), 1, 'owner deletes');
end $$;
reset role;

-- =============================================================================
-- STAFF: reads, cannot write
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', a), 4, 'staff sees all posts of their site');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'staff', 'x')$q$, a), 'staff cannot insert', '42501');
  perform zz_chk.expect_rows(format($q$update public.blog_posts set title = 'nope' where id = %L$q$, (select live_post from _ids)), 0, 'staff update touches nothing');
  perform zz_chk.expect_rows(format($q$delete from public.blog_posts where id = %L$q$, (select live_post from _ids)), 0, 'staff delete touches nothing');
end $$;
reset role;

-- =============================================================================
-- OUTSIDER: public rows only
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select outsider_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare a uuid := (select site_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', a), 2, 'outsider sees only live posts');
  perform zz_chk.expect_fail(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'out', 'x')$q$, a), 'outsider cannot insert', '42501');
end $$;
reset role;

-- =============================================================================
-- ADMIN (super): everything
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin_id from _ids), 'role', 'authenticated')::text, true);
do $$
declare d uuid := (select site_d_id from _ids);
begin
  perform zz_chk.expect_count(format('select count(*) from public.blog_posts where site_id = %L', d), 1, 'admin sees draft-site posts');
  perform zz_chk.expect_rows(format($q$insert into public.blog_posts (site_id, slug, title) values (%L, 'admin', 'Admin post')$q$, d), 1, 'admin inserts anywhere');
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
