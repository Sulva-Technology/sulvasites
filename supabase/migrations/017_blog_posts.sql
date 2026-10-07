-- 017_blog_posts.sql — run once in Supabase SQL Editor (after schema.sql, 001-016).
-- Blog for every template: posts served at /blog, /blog/<slug> and /blog/tag/<tag>, plus /blog/feed.xml.
-- "Blog" joins the site's navigation as soon as one post is published.
-- Depends on 005/007/012 helpers: public.is_site_member / can_edit_site.
-- Idempotent: create if not exists, drop policy/trigger if exists, create or replace function.
--
-- Access model
--   select : anon + authenticated see PUBLISHED posts (published_at in the past) of PUBLISHED sites;
--            members (owner, staff) and site admins see every post of their site, drafts included.
--   write  : owners and site admins (can_edit_site), like page content. Staff read only.
--   service_role bypasses RLS (ops, imports).
-- body is HTML from the dashboard editor; the site sanitises it again when rendering (src/lib/blog/sanitize.ts).

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80 and slug not in ('tag', 'feed', 'page')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  body text not null default '' check (char_length(body) <= 200000),
  cover_url text null check (cover_url is null or (char_length(cover_url) <= 600 and cover_url ~ '^https://[^[:space:]<>"]+$')),
  cover_alt text not null default '' check (char_length(cover_alt) <= 200),
  author_name text not null default '' check (char_length(author_name) <= 80),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  featured boolean not null default false,
  read_minutes smallint not null default 1, -- kept by the guard trigger from body (~220 words a minute)
  status public.publish_status not null default 'draft',
  published_at timestamptz null,
  seo_title text not null default '' check (char_length(seo_title) <= 160),
  seo_description text not null default '' check (char_length(seo_description) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create index if not exists blog_posts_site_published_idx on public.blog_posts (site_id, status, published_at desc);

alter table public.blog_posts enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated: start from nothing.
revoke all on table public.blog_posts from anon, authenticated;
grant all on table public.blog_posts to service_role;
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

-- Public: published, already-dated posts of published sites.
drop policy if exists public_read on public.blog_posts;
create policy public_read on public.blog_posts for select to anon, authenticated
  using (
    status = 'published'::public.publish_status
    and published_at is not null and published_at <= now()
    and exists (select 1 from public.sites s
                where s.id = blog_posts.site_id and s.status = 'published'::public.site_status)
  );

-- Members and site admins: every post of their site (drafts and scheduled too).
drop policy if exists members_read on public.blog_posts;
create policy members_read on public.blog_posts for select to authenticated
  using (public.is_site_member(site_id));

-- Owners and site admins write.
drop policy if exists editors_insert on public.blog_posts;
create policy editors_insert on public.blog_posts for insert to authenticated
  with check (public.can_edit_site(site_id));

drop policy if exists editors_update on public.blog_posts;
create policy editors_update on public.blog_posts for update to authenticated
  using (public.can_edit_site(site_id)) with check (public.can_edit_site(site_id));

drop policy if exists editors_delete on public.blog_posts;
create policy editors_delete on public.blog_posts for delete to authenticated
  using (public.can_edit_site(site_id));

-- Guard (not SECURITY DEFINER, like 009): site_id / id / created_at never change from a client role,
-- tags are 1-40 characters, read_minutes follows the body, at most 1000 posts per site, publishing stamps published_at,
-- updated_at maintained.
create or replace function public.blog_posts_guard() returns trigger
language plpgsql set search_path = public, auth as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.blog_posts where site_id = new.site_id) >= 1000 then
      raise exception 'A site can hold at most 1000 blog posts.' using errcode = '54000';
    end if;
    new.created_at := now();
  elsif current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
       or new.site_id is distinct from old.site_id
       or new.created_at is distinct from old.created_at then
      raise exception 'A post''s site cannot be changed.' using errcode = '42501';
    end if;
  end if;
  if exists (select 1 from unnest(new.tags) t where char_length(btrim(t)) not between 1 and 40) then
    raise exception 'Tags must be 1 to 40 characters.' using errcode = '23514';
  end if;
  new.read_minutes := greatest(1, round(coalesce(array_length(regexp_split_to_array(
    btrim(regexp_replace(regexp_replace(new.body, '<[^>]*>', ' ', 'g'), '&nbsp;', ' ', 'g')), '\s+'), 1), 0) / 220.0));
  if new.status = 'published'::public.publish_status and new.published_at is null then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists blog_posts_guard on public.blog_posts;
create trigger blog_posts_guard before insert or update on public.blog_posts
  for each row execute function public.blog_posts_guard();
