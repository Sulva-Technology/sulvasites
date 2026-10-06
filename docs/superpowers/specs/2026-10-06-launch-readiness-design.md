# Launch readiness — design

Date: 2026-10-06 · Status: draft for review

## Why

Feature coverage is broad (14 templates, owner dashboard, inbox, business data, insights, shop with Paystack
and WhatsApp orders, Ask AI). An audit on 2026-10-06 found the gaps that stop it being "fully ready" for
paying clients:

| Area | Finding |
| --- | --- |
| AI | Live eval `npm run eval:assistant`: **3/20 (15%)**, bar is 85%. Gemini free tier returned 408/429 on every call, Groq hit its rate limit after 3 answers, OpenRouter key not set. Answers that did arrive were correct — the problem is capacity and failover, not prompts. |
| Accounts | No forgot-password flow. Locked-out owners must contact Sulvatech. |
| Sites | No archive or delete. `site_status` has `draft/published/suspended` only. |
| Content | Manual page edits have no history; only Ask AI changes can be undone. |
| SEO | Client sites serve no `sitemap.xml` or `robots.txt`. |
| Domains | `domains` rows are DB-only. Nothing adds the hostname to Vercel, checks DNS or reports SSL. |
| Ops | No error monitoring, no CI, `/admin` is a redirect with no cross-site overview. |

Self-serve signup and billing are **out of scope here** — they get their own spec once this lands.

## Decisions

- **AI tier:** the code must work on free tiers and get better on paid ones, with no code change between them.
  Recommendation to the business: a paid Gemini key (or paid OpenRouter) before onboarding real clients.
  The 85% bar is measured against whatever production uses.
- **Delete is soft by default.** Owners never delete sites. Admins archive; super admins can hard-delete
  an archived site after typing its slug.
- **Revisions via DB trigger**, not app code, because pages are saved from ~10 client components.
- **Error tracking without a new vendor:** server and browser errors go to an `app_errors` table (service role
  only) and show on the admin overview. No new dependency or account; Vercel logs stay as the raw source.
- **Vercel domain automation is optional** — enabled only when `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` are set;
  without them the current manual flow keeps working.

## 1. AI reliability

**Problem:** every provider failure costs a full timeout, and a provider that just returned 429 is tried
again on the very next request.

**Design**

- `src/lib/ai/providerHealth.ts` (new, pure): in-memory cooldown map `provider → until`. A 429 sets a
  cooldown from `Retry-After` (default 30s, max 5 min); a 408/5xx sets 10s. `isCooling(p, now)`.
  Instance-local is fine on Vercel — it only saves wasted calls, never blocks correctness.
- `llm.server.ts`: skip cooling providers unless every provider is cooling (then try the soonest-ready one).
  Record outcomes into `providerHealth`.
- When all providers fail with 429, throw `rate_limited` carrying the shortest cooldown so the existing
  client auto-retry (`assistantClient.ts`, honours `Retry-After`) waits the right time instead of failing.
- Eval runner: `--delay=<ms>` between cases (default 4000 when only free keys are set), and print which
  providers were cooling. Exit code unchanged.
- README: "Production AI" section — which paid key to set, expected cost, how to run the eval.

**Done when:** unit tests cover cooldown + skip + all-cooling path; eval ≥ 85% on the production key set.

## 2. Owner basics

### 2a. Forgot password
- `/login`: "Forgot password?" link → `/forgot-password` (email field → `supabase.auth.resetPasswordForEmail`
  with `redirectTo = <origin>/change-password`). Always shows the same "If that email has an account…"
  message (no account enumeration).
- The recovery link signs the user in (browser client has `detectSessionInUrl: true`) and lands on the
  existing `/change-password` page, which already validates via `passwordPolicy.ts`, clears
  `must_change_password` server-side and routes on. No second form to maintain.
- Add `/forgot-password` to `isBypassPath` so it works on site hosts like `/login` does.
- **Ops prerequisite:** Supabase Auth → custom SMTP (Resend, already used for inbox mail). Supabase's
  built-in mailer allows ~2 emails/hour. `<origin>/change-password` must be in Supabase's allowed redirect URLs.

### 2b. Archive / delete site
- Migration `017_site_archive.sql`: add `sites.archived_at`. Archive = `status 'suspended'` + `archived_at`
  (no enum change). Archived sites are offline (public policies already require `published`); owners keep
  dashboard access so nothing is lost.
- Admin site page: "Archive site" (admin) / "Restore" / "Delete permanently" (super admin, archived only,
  type the slug to confirm). Delete goes through a server route using the service client so storage objects
  under `site-assets/<siteId>/` are removed too; cascade handles rows.
- `/admin/sites` list: `suspended` shows as "Archived"; new Archived filter; "All" hides archived.

### 2c. Page revisions
- Migration `018_page_revisions.sql`: `page_revisions(id, site_id, page_kind 'core'|'extra', page_key,
  data jsonb, status, created_at, created_by)`. `AFTER UPDATE` trigger on `pages` and `extra_pages` stores
  the **old** row when `data` changed. Keep the last 30 per page (trigger deletes older).
  RLS: select for `can_edit_site(site_id)`; no client insert/update/delete.
- Page editors (admin + dashboard share `PageEditor`/`ExtraPageEditor`): "History" panel listing
  revisions (time); "Load" puts that version into the editor as an unsaved draft. Saving it creates a new
  revision of the current content, so a restore is itself undoable.

## 3. SEO: sitemap + robots per site

- `hostRouting.ts` currently *bypasses* `/robots.txt` and `/sitemap.xml`; remove those so site hosts rewrite
  them (the platform host is unaffected — it has no site ref). Add route handlers:
  `src/app/[slug]/sitemap.xml/route.ts`, `src/app/[slug]/robots.txt/route.ts`, and the same under
  `src/app/d/[hostname]/`. Both call one helper in `publicSite.server.ts` that lists published core +
  extra pages (+ shop index and published products when the shop is on) with `lastmod = updated_at`.
- robots: allow all, `Sitemap: <canonical>/sitemap.xml`; unpublished/archived site → `Disallow: /`.
- Root `src/app/robots.ts` for the platform host: disallow `/admin`, `/dashboard`, `/api`, `/dev`.
- Pure builder `src/lib/sitemap.ts` (XML escaping, URL joining) with unit tests.

## 4. Custom domains via Vercel

- `src/lib/vercelDomains.server.ts`: thin REST client — add (`POST /v10/projects/{id}/domains`), status
  (`GET /v9/projects/{id}/domains/{d}` + `GET /v6/domains/{d}/config` for `misconfigured`), verify
  (`POST /v9/.../verify`), remove. Optional `VERCEL_TEAM_ID`. Also adds `www.<domain>` redirecting to apex.
- `src/app/api/admin/sites/[siteId]/domains/route.ts` (admin-only, `requireAdmin`): POST add, GET status,
  DELETE remove. On add: insert row `pending` + Vercel add. Status check: when Vercel says verified and not
  misconfigured → row `active`.
- `DomainsSection.tsx`: shows the DNS records to set (A `76.76.21.21` for apex, CNAME
  `cname.vercel-dns.com` for www, plus any TXT verification Vercel returns), a "Check now" button, and the
  live state (Waiting for DNS / Verifying / Live with SSL). Falls back to today's manual toggle when Vercel
  is not configured.

## 5. Operations

- **CI:** `.github/workflows/ci.yml` — on push/PR: `npm ci`, `npm run lint`, `npm run typecheck`,
  `npm test`. Node 22. No secrets needed.
- **Errors:** migration `019_app_errors.sql`; `instrumentation.ts` `onRequestError` inserts server errors;
  `src/app/global-error.tsx` posts browser crashes to `/api/errors` (rate-limited). Store message, digest,
  path, method, source — never request bodies, headers or query strings (payment data, tokens).
- **Admin overview** `/admin` (replaces redirect): cards for sites (published / draft / archived), unread
  inbox items, orders awaiting action, AI requests this month, domains pending — each scoped to sites the
  admin manages (super admin: all). One server route aggregating with the service client after
  `requireAdmin`, filtered by `is_site_admin`.

## Order of work

1. AI reliability (unblocks the assistant; smallest)
2. Forgot password · 3. Sitemap/robots · 4. Archive/delete · 5. Revisions
6. CI · 7. Error log · 8. Admin overview · 9. Vercel domains

Each step ships on its own with tests, so any can pause without breaking the others.

## Testing

- Pure modules (`providerHealth`, `sitemap`, Vercel response parsing, admin-overview aggregation) get
  `tests/*.test.mjs` unit tests in the existing Node runner style. Revision trigger + pruning is checked
  by a SQL snippet in the migration's comment header, run once in the Supabase SQL editor.
- SQL migrations are idempotent like 001–016 and listed in the README setup order.
- Manual checks per step with the dev server: forgot-password email round-trip, sitemap for a slug and a
  custom host, archive hides the site, restore a revision, Vercel add/verify on a test domain.

## Needs from the business (not code)

- Paid AI key decision (Gemini paid or OpenRouter credits).
- Resend SMTP configured in Supabase Auth; `/change-password` in allowed redirect URLs.
- Vercel API token + project id (+ team id) in env.
