# Search Engine Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Submit every published site (platform, subdomains, custom domains) to Google Search Console and IndexNow (Bing) automatically.

**Architecture:** Per-site `sitemap.xml`/`robots.txt` route handlers feed both engines. A pure state machine (`searchPlan.ts`) decides the next Google step per host; a server runner (`searchIndex.server.ts`) executes it against Google's REST APIs and pushes changed URLs to IndexNow. A daily cron drives everything; browser publish helpers ping a site-scoped endpoint for instant IndexNow pushes; an admin card shows state and offers Resubmit.

**Tech Stack:** Next.js App Router route handlers, Supabase (service role), Node `crypto` for the service-account JWT, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-09-search-engine-submission-design.md`

## Global Constraints

- No new npm dependencies.
- Unit-tested modules use relative `.ts` imports only (no `@/`) — `npm test` runs `node --experimental-strip-types`.
- Source files are CRLF: edit with the Edit tool, not sed/perl.
- Env: `GOOGLE_SEARCH_SA_JSON` (base64 of service-account JSON), `GOOGLE_SEARCH_DOMAIN_PROPERTY` (e.g. `sc-domain:sulvasites.sulvatech.com`), `INDEXNOW_KEY` (8–128 chars `[A-Za-z0-9-]`). Missing → engine skipped, never an error.
- Platform domain: `process.env.NEXT_PUBLIC_PLATFORM_DOMAIN`, lower-cased (same fallback as the calling file).
- Only the service role touches `site_search_index` (RLS on, no policies).
- Commit after each task; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Pure sitemap/robots builders, primary host, routing bypass

**Files:**
- Create: `src/lib/sitemap.ts`, `tests/sitemap.test.mjs`
- Modify: `src/lib/hostRouting.ts` (`isBypassPath`, new `primaryHost`), `tests/hostRouting.test.mjs`

**Interfaces — Produces:**
- `type SitemapEntry = { url: string; lastmod?: string }`
- `siteUrl(host: string, path: string): string` → `https://<host><path>` (`""`/`"/"` → `https://<host>/`)
- `buildSitemapXml(entries: SitemapEntry[]): string` (XML-escaped; invalid `lastmod` dropped; ISO output)
- `buildRobotsTxt(opts: { allow: boolean; sitemapUrl?: string }): string`
- `primaryHost(slug: string, activeDomains: Array<{ hostname: string; created_at: string }>, platformDomain: string): string`
- `isBypassPath` no longer bypasses `/robots.txt`, `/sitemap.xml`; bypasses `/indexnow-key.txt`.

Tests: escaping of `&<>"'`; empty entries → valid empty urlset; lastmod normalised to ISO, garbage dropped; robots allow/disallow text exact; primaryHost picks oldest active domain, falls back to `<slug>.<platform>`; `rewritePathForHost("bakery.P", "/sitemap.xml")` → `/bakery/sitemap.xml`, custom → `/d/client.com/robots.txt`, `/indexnow-key.txt` → null, platform `/sitemap.xml` → null.

- [ ] Write failing tests → run `npm test` (FAIL) → implement → `npm test` (PASS) → commit.

### Task 2: Site sitemap/robots routes + canonical primary host

**Files:**
- Create: `src/lib/search/siteHosts.server.ts`, `src/lib/search/sitemapEntries.server.ts`, `src/lib/search/platformEntries.ts`, `src/lib/search/siteFiles.server.ts`
- Create routes: `src/app/[slug]/sitemap.xml/route.ts`, `src/app/[slug]/robots.txt/route.ts`, `src/app/d/[hostname]/sitemap.xml/route.ts`, `src/app/d/[hostname]/robots.txt/route.ts`
- Modify: `src/app/sitemap.ts` (use `platformEntries`), `src/lib/publicSite.server.ts` (`canonicalHost` = primary host except localhost/`*.vercel.app`)

**Interfaces — Produces:**
- `type HostSite = { id: string; slug: string; template_key: string; status: string; primaryHost: string }`
- `siteForSlug(slug: string): Promise<HostSite | null>`, `siteForHostname(hostname: string): Promise<HostSite | null>`, `primaryHostFor(site: { id: string; slug: string }): Promise<string>`
- `listSitemapEntries(site: { id: string; template_key: string }, host: string): Promise<SitemapEntry[]>` — published core pages (`/`, `/about`, `/contact`, lastmod `updated_at`), published extra pages (`/p/<key>`), blog (`/blog` + `/blog/<slug>`, lastmod `updatedAt`), shop (`/shop` + `/shop/<slug>`, no lastmod) via `loadPublicBlog`/`loadPublicShop`.
- `platformEntries(base: string): Array<SitemapEntry & { priority: number }>`
- `sitemapResponse(site: HostSite | null): Promise<Response>`, `robotsResponse(site: HostSite | null): Response` (unpublished/unknown → `Disallow: /`; `Cache-Control: public, max-age=3600`)

- [ ] Implement → `npx tsc --noEmit` clean → dev check `/<slug>/sitemap.xml`, `/<slug>/robots.txt` → commit.

### Task 3: Migration 020 + README

**Files:** Create `supabase/migrations/020_search_index.sql`; modify `README.md` (setup order + "Search engines" setup section).

Table `public.site_search_index`: `id uuid pk default gen_random_uuid()`, `site_id uuid null references sites on delete cascade`, `host text not null unique`, `kind text not null check (kind in ('platform','subdomain','custom'))`, `google_state text not null default 'pending' check (google_state in ('pending','token','verified','added','submitted'))`, `google_state_at timestamptz not null default now()`, `google_token text`, `sitemap_submitted_at timestamptz`, `indexnow_pushed_at timestamptz`, `failures int not null default 0`, `last_error text`, `last_error_at timestamptz`, `active boolean not null default true`, `checked_at timestamptz`, `created_at`, `updated_at` (+ trigger). Index on `(active, checked_at)`. RLS enabled, no policies. Idempotent.

- [ ] Write migration + README → commit.

### Task 4: Pure search plan, JWT, token parsing

**Files:** Create `src/lib/search/searchPlan.ts`, `src/lib/search/googleJwt.ts`, `tests/searchPlan.test.mjs`, `tests/googleJwt.test.mjs`

**Interfaces — Produces (searchPlan.ts):**
- `type HostKind = "platform" | "subdomain" | "custom"`, `type GoogleState = "pending" | "token" | "verified" | "added" | "submitted"`, `type GoogleStep = "getToken" | "verify" | "add" | "submitSitemap" | "none"`
- `type SearchRow = { host: string; kind: HostKind; google_state: GoogleState; google_state_at: string; google_token: string | null; sitemap_submitted_at: string | null; indexnow_pushed_at: string | null; failures: number }`
- consts `MAX_FAILURES = 5`, `VERIFY_DELAY_MS = 10 min`, `RESUBMIT_MS = 7 days`, `PING_COOLDOWN_MS = 10 min`
- `initialState(kind): GoogleState` (custom → pending, else added)
- `nextGoogleStep(row, contentChangedAt: string | null, now: number): GoogleStep`
- `stateAfter(step: Exclude<GoogleStep, "none">): GoogleState`
- `changedUrls(entries: SitemapEntry[], since: string | null): string[]`
- `latestLastmod(entries): string | null`
- `parseMetaToken(tag: string): string | null`
- `googleSiteUrl(row: { host: string; kind: HostKind }, domainProperty: string): string`
- `chunk<T>(items: T[], size: number): T[][]`

**googleJwt.ts:** `type ServiceAccount = { client_email: string; private_key: string }`; `parseServiceAccount(b64: string): ServiceAccount | null`; `buildJwt(sa, scopes: string[], nowSec: number): string` (RS256 via `node:crypto`, aud `https://oauth2.googleapis.com/token`, exp = now+3600).

Tests: every state transition, verify delay, failure cap, resubmit window, changedUrls with null/old/new lastmods, meta parsing (both quote styles, missing), site URL by kind, chunking; JWT header/claims decode + signature verifies with generated RSA key; bad base64 → null.

- [ ] Failing tests → implement → PASS → commit.

### Task 5: Google + IndexNow clients, key file, verification meta

**Files:** Create `src/lib/search/googleAuth.server.ts`, `src/lib/search/google.server.ts`, `src/lib/search/indexNow.server.ts`, `src/app/indexnow-key.txt/route.ts`; modify `src/lib/publicSite.server.ts` (`googleVerification` on context; `verification.google` in `buildSiteMetadata`).

**Produces:** `googleAccessToken(): Promise<string | null>`; `googleConfigured(): boolean`; `getMetaToken(host)`, `verifySite(host)`, `addSite(siteUrl)`, `submitSitemap(siteUrl, feedUrl)` (throw `Error("Google <status>: <message>")`); `indexNowKey(): string | null`; `pushUrls(host, urls): Promise<void>`.

- [ ] Implement → tsc clean → `curl /indexnow-key.txt` on dev → commit.

### Task 6: Runner + cron

**Files:** Create `src/lib/search/searchIndex.server.ts`, `src/app/api/cron/search/route.ts`; modify `vercel.json` (add `{ "path": "/api/cron/search", "schedule": "30 7 * * *" }`).

**Produces:** `syncRows(db, siteId?: string): Promise<{ inserted: number; deactivated: number }>`; `processRow(db, row, opts: { google: boolean; pushAll?: boolean }): Promise<{ google: GoogleStep | "skipped"; pushed: number; error?: string }>`; `refreshSite(db, siteId, opts: { google: boolean; force?: boolean }): Promise<RowResult[]>`; `ROW_COLUMNS`.

Cron: `CRON_SECRET` bearer check (as billing) → `syncRows` → up to 40 active rows ordered `checked_at` nulls first → `processRow(..., { google: true })` until 50 s budget → JSON summary + one `[search] cron:` log line.

- [ ] Implement → tsc clean → call cron locally with secret → commit.

### Task 7: Ping after publish

**Files:** Create `src/app/api/sites/[siteId]/search-ping/route.ts`, `src/lib/search/notifyClient.ts`; modify `src/lib/publishing.ts` (`publishSite`, `publishPage` → return `site_id`), `src/lib/extraPages.ts` (`publishExtraPage`), `src/components/blog/PostEditor.tsx` (after published save).

Ping: `requireSiteRole(req, siteId, ["owner","staff","admin"])` → service client → `refreshSite(db, siteId, { google: false })` (runner skips rows pushed < `PING_COOLDOWN_MS` ago) → 204. `notifySearchEngines(siteId)`: browser session token → `fetch(..., { method: "POST", keepalive: true })`, all errors swallowed.

- [ ] Implement → tsc clean → commit.

### Task 8: Admin card + resubmit

**Files:** Create `src/app/api/admin/sites/[siteId]/search/route.ts`, `src/components/admin/site/SearchEnginesSection.tsx`; modify `src/app/admin/sites/[siteId]/page.tsx` (render after DomainsSection).

GET → `{ google: boolean, indexNow: boolean, rows }` for the site; POST → `refreshSite(db, siteId, { google: true, force: true })` (resets failures, pushes all URLs) then same payload. Both `requireSiteRole(..., ["admin"])` + `rateLimit`.

- [ ] Implement → tsc clean → dev check card renders → commit.

## Self-review

Spec §1 → T1/T2 · §2 → T1/T2 · §3 → T3 · §4 → T4/T5 · §5 → T4 · §6 → T6 · §7 → T7 · §8 → T8 · §9 → T3 · Error handling → T6 (`processRow` records failures) · Testing → T1/T4.
