-- Add brand_colors column to business_profiles table
-- This stores the extracted dominant and accent colors from the logo

alter table public.business_profiles
add column if not exists brand_colors jsonb null;

-- Add comment for documentation
comment on column public.business_profiles.brand_colors is 'Stores extracted brand colors from logo: {dominant: "#hex", accent: "#hex"}';
