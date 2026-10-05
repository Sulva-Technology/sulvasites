-- 008_inbox.sql — run once in Supabase SQL Editor (after schema.sql, 001-007).
-- Bookings & enquiries inbox: public template forms -> inbox_messages -> dashboard.
-- Depends on 005/007 helpers: public.is_site_member / is_admin (must_change_password gate lives in site_role()).
-- Idempotent: create if not exists, drop policy/trigger if exists, create or replace function.
--
-- Access model
--   insert : service_role only (public API route). No client grant, no policy.
--   select : site members (owner, staff) and admins.
--   update : site members and admins, `status` column only (column grant + guard trigger).
--   delete : admins only.
-- Messages hold visitor PII (name, email, phone): anon has no privileges at all.

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  kind text not null check (kind in ('enquiry','booking')),
  name text not null check (char_length(name) between 1 and 120),
  email text null check (email is null or char_length(email) <= 254),
  phone text null check (phone is null or char_length(phone) <= 20),
  message text not null default '' check (char_length(message) <= 4000),
  extra jsonb not null default '{}'::jsonb
    check (jsonb_typeof(extra) = 'object' and pg_column_size(extra) <= 4096),
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  source_page text null check (source_page is null or char_length(source_page) <= 200),
  spam_score smallint not null default 0 check (spam_score between 0 and 10),
  is_spam boolean not null default false,
  notified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index if not exists inbox_messages_site_created_idx on public.inbox_messages (site_id, created_at desc);
create index if not exists inbox_messages_site_unread_idx on public.inbox_messages (site_id)
  where status = 'new' and not is_spam;

alter table public.inbox_messages enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated: start from nothing.
revoke all on table public.inbox_messages from anon, authenticated;
grant all on table public.inbox_messages to service_role;
grant select, delete on public.inbox_messages to authenticated;
grant update (status) on public.inbox_messages to authenticated;

drop policy if exists members_read on public.inbox_messages;
create policy members_read on public.inbox_messages for select to authenticated
  using (public.is_site_member(site_id));
drop policy if exists members_update_status on public.inbox_messages;
create policy members_update_status on public.inbox_messages for update to authenticated
  using (public.is_site_member(site_id)) with check (public.is_site_member(site_id));
drop policy if exists admin_delete on public.inbox_messages;
create policy admin_delete on public.inbox_messages for delete to authenticated
  using (public.is_admin());

-- Guard (not SECURITY DEFINER: current_user is the invoking role, so service_role / postgres pass
-- through; only client roles are restricted). Defence in depth behind the column-level grant.
create or replace function public.inbox_messages_member_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if current_user in ('authenticated','anon') then
    if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Only the message status can be changed.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists inbox_messages_member_guard on public.inbox_messages;
create trigger inbox_messages_member_guard before update on public.inbox_messages
  for each row execute function public.inbox_messages_member_guard();
