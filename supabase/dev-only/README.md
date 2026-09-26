# ⚠️ DEV ONLY — never run against production

These scripts drop every RLS policy and disable Row Level Security.
The anon key ships to every browser, so with RLS off **anyone on the internet
can read, edit, and delete all sites, pages, admin users, and uploaded files**.

Only use them on a throwaway local/dev Supabase project while debugging.
To restore security afterwards, re-run `../schema.sql` and `../fixes/fix_storage_rls.sql`.
