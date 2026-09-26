-- SQL to create user and add as admin
-- Run this in Supabase SQL Editor

-- Step 1: Create the user in Supabase Auth
-- NOTE: You cannot directly INSERT into auth.users via SQL
-- You must create the user through one of these methods:
--
-- Method A: Supabase Dashboard
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Click "Add user"
--   3. Enter:
--      - Email: <your-email>
--      - Password: <choose a strong password>
--      - Auto Confirm User: Yes
--   4. Click "Create user"
--   5. Copy the User UID (UUID)
--
-- Method B: Supabase Admin API (if you have service role key)
--   Use the auth.admin.createUser() function
--
-- Method C: User signs up through your app's login page
--   Then add them as admin using the SQL below

-- Step 2: Once the user exists, add them as admin by running this:
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = '<your-email>'
ON CONFLICT (user_id) DO NOTHING;

-- Alternative: If you have the UUID directly, use this:
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('<paste-user-uuid-here>')
-- ON CONFLICT (user_id) DO NOTHING;

-- Verify the admin was added:
SELECT 
  au.user_id,
  au.created_at,
  u.email
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
WHERE u.email = '<your-email>';
