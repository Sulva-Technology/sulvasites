# Fix 404 Error for Subdomains

## Why You're Getting 404

The 404 error means:
- ✅ DNS is working (connection established)
- ✅ Vercel is receiving the request
- ❌ Site lookup is failing

## Required Conditions

For `krabel-musicals.soothecontrols.soothetechnologies.com` to work, you need:

### 1. Site Must Exist
- A site with slug `krabel-musicals` must exist in your database
- Check in admin: `/admin/sites` → Look for a site with slug "krabel-musicals"

### 2. Site Must Be Published
- Site status must be `published` (not `draft`)
- In admin: Go to the site → Click "Publish Site" button
- This publishes the site AND all 3 pages (home, about, contact)

### 3. Pages Must Be Published
- All three pages (home, about, contact) must have status `published`
- When you click "Publish Site", it should publish all pages automatically
- Verify in admin: Site → Pages tab → Check each page shows "Published"

## Quick Fix Steps

1. **Go to Admin Panel:**
   - Visit: `https://soothecontrols.soothetechnologies.com/admin/sites`
   - Or: `https://your-vercel-app.vercel.app/admin/sites`

2. **Find the Site:**
   - Look for site with slug `krabel-musicals`
   - If it doesn't exist, create it first

3. **Publish the Site:**
   - Click on the site
   - Click the "Publish Site" button
   - This will:
     - Set site status to `published`
     - Set all pages (home, about, contact) to `published`

4. **Verify:**
   - Check that site status shows "Published"
   - Check that all 3 pages show "Published" status

5. **Test Again:**
   - Wait 1-2 minutes for changes to propagate
   - Visit: `https://krabel-musicals.soothecontrols.soothetechnologies.com`

## Verify Site Exists (SQL Query)

If you have database access, run:

```sql
-- Check if site exists
SELECT id, slug, status 
FROM sites 
WHERE slug = 'krabel-musicals';

-- Check page statuses
SELECT key, status 
FROM pages 
WHERE site_id = (SELECT id FROM sites WHERE slug = 'krabel-musicals');
```

Expected results:
- Site should exist with `status = 'published'`
- All 3 pages (home, about, contact) should have `status = 'published'`

## Common Issues

**Issue:** Site exists but is draft
- **Fix:** Click "Publish Site" in admin panel

**Issue:** Site is published but pages are draft
- **Fix:** "Publish Site" should publish all pages. If not, manually publish each page.

**Issue:** Debug JSON says published, but public page still 404
- **Cause:** The public renderer must read `pages.data`. If your production Supabase/RLS/grants block reading the `data` column (or your DB schema is out of date), the UI can still show “published” but the public render fails.
- **Fix:**
  - Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars (server-only) and redeploy, or
  - Ensure public policies/grants allow selecting `pages.data` for published pages.
  - Use the debug endpoint below and check `pages.dataAccess.ok`.

**Issue:** Site slug doesn't match
- **Fix:** Ensure the slug in database exactly matches `krabel-musicals` (case-sensitive, no spaces)

**Issue:** Environment variable not set
- **Fix:** Set `NEXT_PUBLIC_PLATFORM_DOMAIN=soothecontrols.soothetechnologies.com` in Vercel and redeploy

## Test the Route Directly

As a sanity check, test if the site works via path-based routing:
- `https://soothecontrols.soothetechnologies.com/krabel-musicals`
- `https://your-vercel-app.vercel.app/krabel-musicals`

If this works but the subdomain doesn't, it's a middleware/routing issue.
If this also gives 404, the site isn't published or doesn't exist.

## Use the Debug Endpoint

Admin-only (needs your Supabase access token). While logged in to `/admin`, run in the browser console:

```js
const s = JSON.parse(localStorage.getItem("soothecontrols-auth"));
await (await fetch("/api/debug/site/<slug>", {
  headers: { Authorization: `Bearer ${s.access_token}` },
})).json();
```

Look for:
- `diagnosis.canResolve === true`
- `pages.dataAccess.ok === true`
