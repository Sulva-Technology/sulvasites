-- Add yourself as admin
-- Run this in Supabase SQL Editor
-- This bypasses RLS because it runs with database privileges

-- Option 1: If you know your email address
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = '<your-email>'
ON CONFLICT (user_id) DO NOTHING;

-- Option 2: If you know your user UUID (from Supabase Dashboard → Authentication → Users)
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('YOUR_USER_UUID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;

-- Option 3: Get your user ID first, then add it
-- Step 1: Find your user ID
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Copy your UUID from above and run:
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('paste-your-uuid-here')
-- ON CONFLICT (user_id) DO NOTHING;

-- Verify you were added:
SELECT 
  au.user_id,
  au.created_at,
  u.email
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
ORDER BY au.created_at DESC;
