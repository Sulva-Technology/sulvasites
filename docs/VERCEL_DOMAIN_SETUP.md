# Vercel Domain Setup Guide

## Option 2: Base Domain + Wildcard DNS

### Step 1: Add Domain in Vercel

1. Go to your Vercel project → Settings → Domains
2. Click "Add Domain"
3. Enter: `soothecontrols.soothetechnologies.com`
4. Select "Connect to an environment" → Production
5. Click "Save"

**Important:** Do NOT add `*.soothecontrols.soothetechnologies.com` in Vercel. The wildcard is handled at the DNS level.

### Step 2: Set Environment Variable

1. Go to Vercel project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `NEXT_PUBLIC_PLATFORM_DOMAIN`
   - **Value:** `soothecontrols.soothetechnologies.com`
   - **Environment:** Select all (Production, Preview, Development)
3. Click "Save"
4. **Redeploy** your project for the change to take effect

### Step 3: Configure DNS

At your DNS provider (where `soothetechnologies.com` is managed):

#### For the base domain:
- **Type:** A or CNAME
- **Name:** `soothecontrols` (or `@` if at root)
- **Value:** Vercel's IP or CNAME target (Vercel will show this after adding the domain)

#### For wildcard subdomains:
- **Type:** A or CNAME  
- **Name:** `*` (wildcard)
- **Value:** Same as base domain (Vercel's IP or CNAME target)

**Note:** After adding the domain in Vercel, Vercel will show you the exact DNS records to add. Use those values.

### Step 4: Verify

After DNS propagates (can take up to 48 hours, usually much faster):

1. Test base domain: `https://soothecontrols.soothetechnologies.com` → Should show your admin/login
2. Test subdomain: `https://<any-slug>.soothecontrols.soothetechnologies.com` → Should show that site

### How It Works

- Base domain (`soothecontrols.soothetechnologies.com`) → Admin interface
- Wildcard subdomains (`*.soothecontrols.soothetechnologies.com`) → Individual sites
  - Example: `site1.soothecontrols.soothetechnologies.com` → Site with slug "site1"
  - Example: `client.soothecontrols.soothetechnologies.com` → Site with slug "client"

The middleware automatically routes:
- `<slug>.soothecontrols.soothetechnologies.com` → `/<slug>`
- Custom domains (added in admin) → `/d/<hostname>`
