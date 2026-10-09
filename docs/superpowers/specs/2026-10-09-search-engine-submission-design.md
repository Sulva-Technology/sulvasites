# Search engine submission (Google + Bing) — design

Date: 2026-10-09 · Status: draft for review

## Goal

Every published site — the platform marketing site, every `<slug>.sulvasites.sulvatech.com` subdomain and
every active custom domain — is submitted to Google and Bing automatically, with no action from the client
or from Sulvatech staff after a one-time setup. Sulvatech owns all Google Search Console properties; clients
get no Search Console access.

## Constraints that shape the design

- Google retired the sitemap ping endpoint (2023). The Indexing API only accepts JobPosting/BroadcastEvent
  pages. The supported automation is the **Search Console API** (add site, submit sitemap) plus the
  **Site Verification API** (META-tag verification), called by a service account.
- Bing (plus Yandex, Seznam, Naver) accepts **IndexNow**: POST changed URLs with a key that is also served
  as a text file on the host. No per-site verification.
- Pages are published from the browser (`src/lib/publishing.ts` → Supabase), so there is no server hook on
  publish today. Vercel runs one daily cron (`/api/cron/billing`).
- Client sites serve no `sitemap.xml`/`robots.txt` yet: `isBypassPath` sends both to the platform's root
  handlers, which return nothing for client hosts (launch-readiness §3 was never built).
- `canonicalHost` is the request host, so a site with a custom domain is canonical on both its subdomain
  and its custom domain (duplicate content).

## Approach

Daily cron does all Google work and catches up IndexNow; a fire-and-forget ping after publish pushes
changed URLs to IndexNow within seconds. Rejected: cron-only (Bing waits up to 24 h for nothing gained) and
Bing Webmaster API (needs per-site Bing verification; IndexNow does the job without it).

## 1. Per-site sitemap + robots (prerequisite)

- `src/lib/sitemap.ts` (pure): `buildSitemapXml(entries)` and `buildRobotsTxt({ allow, sitemapUrl })` with
  XML escaping and URL joining.
- `src/lib/sitemapEntries.server.ts`: `listSitemapEntries(siteId, host)` returns published URLs with
  `lastmod`: home, about, contact (`pages.status = 'published'`), published extra pages (`/p/<key>`), blog
  index + published posts when the site has posts, shop index + active products when the shop is on.
  `lastmod` = the row's `updated_at`.
- Route handlers `src/app/[slug]/sitemap.xml/route.ts`, `src/app/[slug]/robots.txt/route.ts` and the same
  under `src/app/d/[hostname]/`. Remove `/robots.txt` and `/sitemap.xml` from `isBypassPath` so site hosts
  rewrite to them; the platform host has no site ref, so the root `robots.ts`/`sitemap.ts` keep serving it.
- robots: published site → `Allow: /`, `Disallow: /dashboard`, `Sitemap: https://<primary host>/sitemap.xml`.
  Not published → `Disallow: /`.

## 2. Primary host (canonical fix)

- `primaryHost(site, domains, platform)` (pure, in `src/lib/hostRouting.ts`): the oldest `active` custom
  domain, else `<slug>.<platform>`.
- `canonicalHost` in `publicSite.server.ts`, sitemap URLs and every submission use the primary host. The
  subdomain of a site with a custom domain stays reachable but declares the custom domain as canonical, and
  is never submitted.

## 3. Data: `site_search_index` (migration `020_search_index.sql`)

One row per submitted host (platform host has `site_id = null`).

| column | notes |
|---|---|
| `id uuid pk`, `site_id uuid null fk sites on delete cascade`, `host text unique` | |
| `kind text` | `platform` · `subdomain` · `custom` |
| `google_state text` | `pending` → `token` → `verified` → `added` → `submitted`; subdomains/platform skip to `added` (covered by the domain property) |
| `google_state_at timestamptz` | when the state last changed (verify waits ≥ 10 min after the token) |
| `google_token text null` | META verification content value |
| `checked_at timestamptz null` | last cron visit; the cron visits oldest-first |
| `sitemap_submitted_at`, `indexnow_pushed_at timestamptz null` | |
| `failures int default 0`, `last_error text null`, `last_error_at timestamptz null` | |
| `active bool default true`, `created_at`, `updated_at` | `active = false` when the host stops being a published primary host |

RLS enabled with no policies: only the service role reads/writes. Idempotent like 001–019; listed in the
README setup order.

`generateMetadata` for a site reads the row's `google_token` for the request host and adds
`verification: { google: token }` (Next renders the `google-site-verification` meta tag). The lookup is
wrapped in React `cache()` like the site resolve, and only runs for custom-domain hosts.

## 4. Clients

- `src/lib/search/googleAuth.server.ts`: service-account JWT (RS256 via `node:crypto`, no new dependency)
  exchanged for an access token with scopes `webmasters` + `siteverification`; token cached in memory until
  expiry. Credentials from `GOOGLE_SEARCH_SA_JSON` (base64 of the key JSON).
- `src/lib/search/google.server.ts`:
  - `getMetaToken(host)` → `POST siteVerification/v1/token` (`type: SITE`, `verificationMethod: META`);
    parses `content="…"` out of the returned tag (parser is pure and unit-tested).
  - `verifySite(host)` → `POST siteVerification/v1/webResource?verificationMethod=META`.
  - `addSite(siteUrl)` → `PUT webmasters/v3/sites/{siteUrl}`.
  - `submitSitemap(siteUrl, feedUrl)` → `PUT webmasters/v3/sites/{siteUrl}/sitemaps/{feedUrl}`.
  - `siteUrl` is `https://<host>/` for custom domains, `GOOGLE_SEARCH_DOMAIN_PROPERTY`
    (`sc-domain:sulvasites.sulvatech.com`) for subdomains and the platform.
- `src/lib/search/indexNow.server.ts`: `pushUrls(host, urls)` → `POST https://api.indexnow.org/indexnow`
  `{ host, key, keyLocation, urlList }`, batches of ≤10,000; 200/202 = ok, anything else throws with status.
- Key file: root route `src/app/indexnow-key.txt/route.ts` returns `INDEXNOW_KEY` as `text/plain`;
  `/indexnow-key.txt` joins `isBypassPath` so every host serves it; `keyLocation` =
  `https://<host>/indexnow-key.txt`.
- Any missing env var → that engine is skipped and logged once per run; the admin panel says
  "not configured".

## 5. State machine (pure: `src/lib/search/searchPlan.ts`)

`nextGoogleStep(row, siteUpdatedAt, now)` returns one of `getToken | verify | add | submitSitemap | none`:

- custom: `pending` → `getToken`; `token` → `verify` (verify runs on the next cron run, never the same
  one, so any cached page render has picked up the meta tag);
  `verified` → `add`; `added` → `submitSitemap`.
- subdomain/platform start at `added` → `submitSitemap`.
- `submitted` → `submitSitemap` again only when content changed since `sitemap_submitted_at` and the last
  submit is ≥ 7 days old (Google re-reads sitemaps on its own).
- `failures ≥ 5` → `none` until reset (admin Resubmit). Each success resets `failures` to 0.

`changedUrls(entries, indexnowPushedAt)` returns sitemap entries with `lastmod > indexnow_pushed_at`
(all entries when null).

## 6. Cron `/api/cron/search` (daily `30 7 * * *`, same `CRON_SECRET` check as billing)

1. **Sync rows:** upsert a row for the platform host and each published site's primary host; set
   `active = false` on rows whose host is no longer a published primary host.
2. **Google:** for active rows ordered by `updated_at`, run one `nextGoogleStep` each, capped at 40 rows per
   run (`maxDuration = 60`). Errors are written to the row and never stop the loop.
3. **IndexNow:** per active row, push `changedUrls`; set `indexnow_pushed_at = now` on success.
4. Log one summary line `[search] cron: …` with counts.

## 7. Ping after publish

- `POST /api/sites/[siteId]/search-ping`: caller must pass `can_edit_site`. Skips if the site is not
  published or the host's `indexnow_pushed_at` is under 10 minutes old; otherwise runs step 6.3 for that
  site's primary host. Always responds 204 (fire-and-forget).
- Every browser publish helper (`publishSite`, `publishPage`, and the extra-page/blog/product publish paths
  found during planning) calls it with `fetch(..., { keepalive: true }).catch(() => {})` after a successful
  write. A failed ping changes nothing; the cron catches up.

## 8. Admin panel

- "Search engines" card on the admin site page: per host — kind, Google state, sitemap submitted at,
  IndexNow pushed at, last error. "Resubmit now" → `POST /api/admin/sites/[siteId]/search-resubmit`
  (`requireAdmin`): resets `failures`, runs one Google step + an IndexNow push of all URLs inline, returns
  the updated row.
- Nothing in the owner dashboard.

## 9. One-time manual setup (README)

1. Google Cloud: create a service account, enable Search Console API + Site Verification API, create a
   JSON key → `GOOGLE_SEARCH_SA_JSON` (base64) in Vercel.
2. Search Console: add Domain property `sulvasites.sulvatech.com` (DNS TXT), add the service account email
   as an **Owner**. Set `GOOGLE_SEARCH_DOMAIN_PROPERTY=sc-domain:sulvasites.sulvatech.com`.
3. `INDEXNOW_KEY`: 32 random hex chars in Vercel.
4. Run migration `020_search_index.sql`; add the cron to `vercel.json`.
5. Optional: Bing Webmaster Tools → import from Google Search Console for a Bing dashboard.

## Error handling

- Google 403 on a custom domain verify (tag not served yet / DNS not live) counts as a failure and retries
  next run; after 5 the panel shows the last error and Resubmit.
- Google 429/5xx: failure, retried next run.
- IndexNow 422 (URLs not on host) / 403 (key not found): logged on the row; 429: retried next run.
- Domain removed → row goes inactive; the Search Console property is left in place (harmless).

## Testing

- Unit (`tests/*.test.mjs`, Node runner, relative `.ts` imports): `sitemap.ts` builders, `primaryHost`,
  `searchPlan` transitions + backoff + `changedUrls`, META token parsing, JWT claim building, IndexNow
  batching/payload, `isBypassPath` changes in `hostRouting.test.mjs`.
- Manual: dev server `curl` of `/sitemap.xml`, `/robots.txt`, `/indexnow-key.txt` on a slug and a custom
  host; after env setup, call the cron with `CRON_SECRET` on production and check the panel and Search
  Console.

## Out of scope

Index coverage / search stats in dashboards, client Search Console access, Bing Webmaster API, Google
Indexing API, hreflang/image sitemaps.
