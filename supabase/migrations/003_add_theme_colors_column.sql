-- Adds a JSONB column for per-template theme colors.
-- This is idempotent and safe to run multiple times.

alter table public.business_profiles
  add column if not exists theme_colors jsonb null;

comment on column public.business_profiles.theme_colors is
  'Per-template theme color overrides, stored as JSON (e.g. { "t4": { "accent": "#...", "accent2": "#..." } }).';

-- Force PostgREST (Supabase API) to reload schema cache.
-- If your project does not allow NOTIFY, you can instead use the Dashboard: Settings -> API -> Reload schema.
notify pgrst, 'reload schema';

