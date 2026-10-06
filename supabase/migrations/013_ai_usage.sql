-- 013_ai_usage.sql — run once in Supabase SQL Editor (after schema.sql and 001-012).
-- Metering for the "Ask AI" site assistant: one row per AI request, used to enforce each site's
-- monthly allowance (AI_ASSISTANT_MONTHLY_LIMIT, default 50; Sulvatech admins are not metered).
-- feature 'assistant' = an answer that proposed a change (counted); 'assistant_chat' = advice or no change
-- (not counted toward the allowance, but capped at 3x it to stop unlimited free use).
-- Idempotent.
--
-- Access model
--   insert / select : service_role only (the /api/sites/[siteId]/assistant route). RLS on, no policies,
--                     no client grants, so owners cannot read or reset their own usage.

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null,
  feature text not null default 'assistant' check (char_length(feature) between 1 and 40),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_site_feature_created_idx on public.ai_usage (site_id, feature, created_at desc);

alter table public.ai_usage enable row level security;

revoke all on table public.ai_usage from anon, authenticated;
grant all on table public.ai_usage to service_role;
grant usage, select on sequence public.ai_usage_id_seq to service_role;
