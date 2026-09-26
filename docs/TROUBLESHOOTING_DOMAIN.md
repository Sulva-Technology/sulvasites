# Troubleshooting Domain Connection Issues

## Error: ERR_CONNECTION_CLOSED

If you're seeing "This site can't be reached" or "ERR_CONNECTION_CLOSED" for subdomains like `krabel-musicals.soothecontrols.soothetechnologies.com`, check these:

### 1. Verify DNS Resolution

Test if DNS is resolving correctly:

```bash
# Check base domain
nslookup soothecontrols.soothetechnologies.com

# Check wildcard subdomain
nslookup krabel-musicals.soothecontrols.soothetechnologies.com
```

Both should resolve to Vercel's IP addresses or CNAME target (`5ea8538923b8115e.vercel-dns-017.com.`).

**If DNS is not resolving:**
- Wait 5-30 minutes for DNS propagation
- Verify CNAME records in Namecheap are saved correctly
- Check that both `soothecontrols` and `*.soothecontrols` CNAME records exist

### 2. Verify Vercel Domain Configuration

**Important:** Vercel may require the wildcard domain to be added explicitly.

1. Go to Vercel → Settings → Domains
2. Check if `soothecontrols.soothetechnologies.com` is listed and shows "Valid Configuration"
3. **Try adding the wildcard explicitly:**
   - Click "Add Domain"
   - Enter: `*.soothecontrols.soothetechnologies.com`
   - Select Production environment
   - Click Save

**Note:** Some Vercel configurations require both the base domain AND the wildcard to be added in Vercel, even though DNS handles the routing.

### 3. Verify Environment Variable

1. Go to Vercel → Settings → Environment Variables
2. Confirm `NEXT_PUBLIC_PLATFORM_DOMAIN` is set to: `soothecontrols.soothetechnologies.com`
3. Ensure it's applied to **Production** environment
4. **Redeploy** after setting/changing the variable

### 4. Check Vercel Deployment

1. Go to Vercel → Deployments
2. Ensure the latest deployment is successful
3. Check deployment logs for any errors
4. Verify the environment variable is present in the deployment

### 5. Test Base Domain First

Before testing subdomains, verify the base domain works:

- `https://soothecontrols.soothetechnologies.com` → Should show admin/login

If the base domain doesn't work, fix that first before testing subdomains.

### 6. Common Issues

**Issue:** DNS resolves but connection fails
- **Solution:** Vercel might not have the wildcard domain configured. Add `*.soothecontrols.soothetechnologies.com` in Vercel domains.

**Issue:** Environment variable not set
- **Solution:** Set `NEXT_PUBLIC_PLATFORM_DOMAIN=soothecontrols.soothetechnologies.com` and redeploy.

**Issue:** DNS not propagated yet
- **Solution:** Wait 15-60 minutes. DNS propagation can take time.

**Issue:** Site slug doesn't exist
- **Solution:** Ensure a site with slug `krabel-musicals` exists in your database and is published.

### 7. Verify Site Exists

In your admin panel, check:
1. Does a site with slug `krabel-musicals` exist?
2. Is the site status `published`?
3. Are the pages (home, about, contact) published?

### 8. Test with Vercel Preview URL

As a sanity check, test if the site works via Vercel's preview URL:
- `https://your-project.vercel.app/krabel-musicals`

If this works but the subdomain doesn't, it's a DNS/Vercel domain configuration issue.

### 9. Check Vercel Domain Status

In Vercel → Settings → Domains:
- Base domain should show: ✅ "Valid Configuration"
- Wildcard (if added) should show: ✅ "Valid Configuration"
- If either shows an error, fix the DNS records as indicated

### Quick Checklist

- [ ] DNS CNAME records exist for both `soothecontrols` and `*.soothecontrols`
- [ ] Both CNAME records point to `5ea8538923b8115e.vercel-dns-017.com.`
- [ ] `soothecontrols.soothetechnologies.com` is added in Vercel
- [ ] `*.soothecontrols.soothetechnologies.com` is added in Vercel (try this if base domain works but subdomains don't)
- [ ] `NEXT_PUBLIC_PLATFORM_DOMAIN` environment variable is set
- [ ] Environment variable is applied to Production
- [ ] Project has been redeployed after setting environment variable
- [ ] Site with slug `krabel-musicals` exists and is published
- [ ] Base domain `soothecontrols.soothetechnologies.com` works first
