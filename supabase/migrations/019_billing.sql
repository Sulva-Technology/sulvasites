-- 019_billing.sql — public site + self-serve trial + Paystack subscription billing.
-- Spec: docs/superpowers/specs/2026-10-08-public-site-pricing-design.md. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Plans (filled by scripts/paystack-plans.mjs)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id text primary key,                                   -- e.g. 'business-monthly-launch'
  tier text not null check (tier in ('starter','business','commerce')),
  interval text not null check (interval in ('monthly','annually')),
  price_kobo bigint not null check (price_kobo > 0),
  launch boolean not null default false,
  paystack_plan_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.billing_plans enable row level security;
drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- One subscription row per site. No row (or status 'manual') = no plan limits.
-- ---------------------------------------------------------------------------
create table if not exists public.site_subscriptions (
  site_id uuid primary key references public.sites(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  tier text not null default 'starter' check (tier in ('starter','business','commerce')),
  interval text not null default 'monthly' check (interval in ('monthly','annually')),
  plan_id text references public.billing_plans(id),
  status text not null check (status in ('trialing','active','past_due','cancelling','paused','archived','manual')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  paused_at timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text unique,
  flagged text,
  blocked boolean not null default false,
  emails_sent text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_subscriptions_owner_idx on public.site_subscriptions(owner_id);
create index if not exists site_subscriptions_status_idx on public.site_subscriptions(status);
-- At most one running trial per account (the API also enforces one unpaid site).
create unique index if not exists site_subscriptions_one_trial_per_owner
  on public.site_subscriptions(owner_id) where status = 'trialing';

drop trigger if exists site_subscriptions_updated_at on public.site_subscriptions;
create trigger site_subscriptions_updated_at before update on public.site_subscriptions
  for each row execute function public.set_updated_at();

alter table public.site_subscriptions enable row level security;
drop policy if exists site_subscriptions_member_read on public.site_subscriptions;
create policy site_subscriptions_member_read on public.site_subscriptions
  for select to authenticated using (public.is_site_member(site_id));
-- All writes go through the service role (API routes, webhook, cron).

-- Card authorization + Paystack email token: service role only (RLS on, no policies).
create table if not exists public.billing_secrets (
  site_id uuid primary key references public.sites(id) on delete cascade,
  authorization_code text,
  email_token text,
  updated_at timestamptz not null default now()
);
alter table public.billing_secrets enable row level security;

-- ---------------------------------------------------------------------------
-- Checkouts + processed webhook events (idempotency via event_key)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete set null,
  event_key text not null unique,
  kind text not null,
  plan_id text,
  amount_kobo bigint,
  status text not null default 'done',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists billing_events_site_idx on public.billing_events(site_id, created_at desc);
alter table public.billing_events enable row level security;
drop policy if exists billing_events_member_read on public.billing_events;
create policy billing_events_member_read on public.billing_events
  for select to authenticated using (site_id is not null and public.is_site_member(site_id));

-- ---------------------------------------------------------------------------
-- Done-for-you briefs, domain add-on requests, signup signals (service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  business text not null,
  category text,
  template_key text,
  tier text,
  domain text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
alter table public.leads enable row level security;

create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  desired_name text not null,
  status text not null default 'requested' check (status in ('requested','quoted','paid','active','rejected')),
  renews_at date,
  renewal_reminded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists domain_requests_site_idx on public.domain_requests(site_id);
alter table public.domain_requests enable row level security;

create table if not exists public.signup_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  normalized_email text,
  phone_e164 text,
  device_hash text,
  ip_hash text,
  business_key text,
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists signup_signals_email_idx on public.signup_signals(normalized_email);
create index if not exists signup_signals_phone_idx on public.signup_signals(phone_e164);
create index if not exists signup_signals_device_idx on public.signup_signals(device_hash);
create index if not exists signup_signals_ip_idx on public.signup_signals(ip_hash, created_at desc);
create index if not exists signup_signals_business_idx on public.signup_signals(business_key);
alter table public.signup_signals enable row level security;

-- ---------------------------------------------------------------------------
-- Public billing state for site rendering. Must match isLive() in
-- src/lib/billing/subscriptionState.ts. No row => zero rows (caller treats as live).
-- ---------------------------------------------------------------------------
create or replace function public.site_billing_state(p_site uuid)
returns table (live boolean, badge boolean, tier text, status text)
language sql stable security definer set search_path = public as $$
  select
    (not s.blocked) and case s.status
      when 'manual' then true
      when 'active' then true
      when 'trialing' then coalesce(s.trial_ends_at > now(), false)
      when 'past_due' then coalesce(s.grace_ends_at > now(), false)
      when 'cancelling' then coalesce(s.current_period_end > now(), false)
      else false
    end,
    s.status <> 'manual' and (s.status = 'trialing' or s.tier = 'starter'),
    s.tier,
    s.status
  from public.site_subscriptions s
  where s.site_id = p_site;
$$;
revoke all on function public.site_billing_state(uuid) from public;
grant execute on function public.site_billing_state(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing sites: admin-managed, everything included.
-- ---------------------------------------------------------------------------
insert into public.site_subscriptions (site_id, owner_id, tier, status)
select s.id, null, 'commerce', 'manual' from public.sites s
on conflict (site_id) do nothing;

-- ---------------------------------------------------------------------------
-- Client sites may not take platform route names (keep in sync with src/lib/reservedSlugs.ts).
-- NOT VALID: existing rows are not re-checked.
-- ---------------------------------------------------------------------------
alter table public.sites drop constraint if exists sites_slug_not_reserved;
alter table public.sites add constraint sites_slug_not_reserved check (slug <> all (array[
  'about','admin','api','blog','change-password','contact','d','dashboard','dev',
  'forgot-password','help','login','no-access','pricing','privacy','signup','start',
  'templates','terms','www'
]::text[])) not valid;

notify pgrst, 'reload schema';
