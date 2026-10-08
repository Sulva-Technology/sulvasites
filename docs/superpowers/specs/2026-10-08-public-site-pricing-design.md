# Public site, pricing, self-serve trial and billing — design

Date: 2026-10-08 · Status: draft for review

## Why

`/` on the platform domain is a "Go to login" stub. There is no way for a business to discover Sulva Sites,
see prices, or get a site without contacting Sulvatech. Before going public we need:

1. A marketing site with templates and pricing.
2. Two ways to buy: **Do it yourself** (self-serve, 7-day free trial) and **Done for you** (Sulvatech builds it).
3. Recurring billing for self-serve sites, with plan limits.

The launch-readiness spec (2026-10-06) deferred "self-serve signup and billing" to its own spec. This is it.

## Decisions

| Topic | Decision |
| --- | --- |
| Buy paths | DIY: signup wizard, 7 days free, no card. Done for you: brief form → lead → admin builds site. |
| Price model | Monthly (or annual = 10× monthly). Setup fee **only** on Done for you. |
| Launch promo | Launch price = standard ÷ 3 (monthly rounded up to the nearest ₦500). Shown with standard price struck through and the **real** end date (launch date + 6 months, default 8 Apr 2027). |
| Promo lock-in | Anyone who subscribes during launch keeps the launch price for life. |
| Trial end | No card at signup. Owner adds card via Paystack subscription. Unpaid at day 7 → site paused. |
| Billing engine | Paystack Plans + Subscriptions on the platform account. |
| Enforcement | Lazy at render/API time from subscription status; one daily cron only for emails and status sweeps. |
| Wizard | Short form wizard + one-shot AI build, falling back to template sample content when AI fails. |
| Verification | Email OTP only for now. Phone OTP deferred; module is pluggable. |
| Site limit | Max one unpaid site per account. Second+ sites have no trial. |
| Domain add-on | We buy + manage: `.com` ₦25,000/yr, `.com.ng` ₦15,000/yr, not discounted. Connecting an owned domain is free on Business + Commerce. Purchase is manual (admin). |
| Look | Extend the existing koi admin brand (tokens in `globals.css`, Inter Tight + Instrument Serif), light only. |
| Existing sites | Become `manual` + `commerce` tier. No behaviour change. |

## Pricing

All amounts live in `src/lib/marketing/pricing.ts` (single source of truth).

| Plan | Standard monthly | Launch monthly | Standard annual | Launch annual | DFY setup (standard → launch) |
| --- | --- | --- | --- | --- | --- |
| Starter | ₦10,000 | ₦3,500 | ₦100,000 | ₦35,000 | ₦150,000 → ₦50,000 |
| Business | ₦20,000 | ₦7,000 | ₦200,000 | ₦70,000 | ₦300,000 → ₦100,000 |
| Commerce | ₦35,000 | ₦12,000 | ₦350,000 | ₦120,000 | ₦450,000 → ₦150,000 |

Rules (unit-tested): launch monthly = `ceil(standard / 3 / 500) * 500`; annual = `10 × monthly`; launch setup =
`standard setup / 3`. Domain add-on prices are fixed and never discounted.

### Plan features

`planFeatures(tier)` in `src/lib/billing/planFeatures.ts`, pure, derived from the pricing config.

| Feature | Starter | Business | Commerce |
| --- | --- | --- | --- |
| Any template, pages, blog, inbox | ✓ | ✓ | ✓ |
| "Built with Sulva Sites" badge | shown | hidden | hidden |
| Connect own domain | — | ✓ | ✓ |
| Business data, insights | — | ✓ | ✓ |
| Ask AI requests / month (existing `ai_usage`) | 20 | 100 | 200 |
| Staff seats | 0 | 2 | 5 |
| Shop / food ordering with checkout | — | — | ✓ |

- Gates are enforced server-side in the relevant API routes (domain add, staff invite, checkout, AI) and shown
  in the UI as a lock with an "Upgrade" link to the Billing tab.
- Shop templates (t7 Tavola, t13 Mode, t14 Cartly) on a lower tier render as a catalogue/menu without cart.
- Downgrading never deletes data; features switch off.

## 1. Public marketing site

Served on the platform domain only (`sulvasites.sulvatech.com`, `NEXT_PUBLIC_PLATFORM_DOMAIN`). Client
subdomains and custom domains are unaffected (`hostRouting.ts` already returns null for the platform host).

| Route | Content |
| --- | --- |
| `/` | Hero with serif-italic accent word and water gradient; launch banner; CTAs **Start free trial** → `/signup`, **Have us build it** → `/start`. Template strip (6 live thumbnails), feature grid (dashboard, inbox, shop with Paystack + WhatsApp, blog, Ask AI, light/dark), how it works (3 steps per path), pricing teaser, FAQ, footer CTA. |
| `/templates` | All 17 templates from `TEMPLATE_META`, category filter, card → demo. |
| `/templates/[key]` | Full-screen public demo with sample data (production-safe version of `/dev/templates/[key]`) and a sticky bar: "Use this template" → `/signup?template=<key>`, "Have us build it" → `/start?template=<key>`. |
| `/pricing` | DIY / Done-for-you toggle, monthly / annual toggle, 3 tier cards (struck standard + launch price + end date), compare table, domain add-on card, FAQ (trial, cancel, price lock, refunds). |
| `/signup` | Trial wizard (section 2). |
| `/start` | Done-for-you brief: name, business, category, template (optional), plan, WhatsApp, email, wants domain (optional desired name), notes → `leads` row + Resend email to Sulvatech; success screen with "Chat on WhatsApp" button. |

Components live in `src/components/marketing/`; pages wrap themselves in a `MarketingShell` component (no route group, so `/templates` and `/templates/[key]` can coexist). Each page sets metadata + OG image. The platform domain
serves `sitemap.xml` / `robots.txt` listing the marketing routes and template demos.

### Reserved slugs

Sites are also served path-based at `/[slug]`, so a site slugged `pricing` would collide with a marketing
route. `src/lib/reservedSlugs.ts` lists: `admin, api, blog, change-password, d, dashboard, dev, forgot-password,
login, no-access, pricing, signup, start, templates, terms, privacy, about, contact, help, www`. Enforced in
`slugify` callers (wizard + admin create) and by a DB check constraint on `sites.slug`.

## 2. Self-serve signup and trial

### Wizard (`/signup`)

State is kept in `sessionStorage` so a refresh does not lose answers. Steps:

1. **Your business** — business name, what you do (one line), city, WhatsApp number, "sell online?" toggle.
2. **Pick a look** — 3 suggestions from `templateChoice.ts` (keyword fallback, no AI needed), "see all 17"
   opens the gallery. `?template=` preselects.
3. **Pick a plan** — tier + monthly/annual. Shop toggle or shop template nudges Commerce. Shows
   "₦0 today · 7 days free · no card".
4. **Account** — full name, email, password → Supabase `signUp` → 6-digit email OTP verified inline
   (`verifyOtp`, type `signup`; the Supabase email template must include `{{ .Token }}`).

Then a **build screen** calls `POST /api/signup/build` (service role):

1. Runs the abuse checks and the one-unpaid-site rule (below).
2. Creates the site (reserved-slug aware), an owner `site_members` row and a `site_subscriptions` row
   (`trialing`, `trial_ends_at = now + 7 days`, chosen plan).
3. Builds content: step-1 answers → `Brief` → `siteBuilder` → same persistence as `createSiteFromBuild`
   (new server function `persistTrialSite` in `src/lib/signup/` taking the service client; the admin `createSiteFromBuild` stays unchanged). On AI failure or timeout (25s),
   uses the template's sample content with business name, city, WhatsApp and email swapped in.
4. Publishes the site and returns `{ siteId, slug }`. The client redirects to `/dashboard/<siteId>`, where the
   existing onscreen tour starts. Live URL: `<slug>.<platform>`.

Max one AI build per account; the endpoint is idempotent per account (a retry returns the existing site).

### Trial rules

- Full features of the chosen tier, except **card checkout is off** while `trialing` — shops take WhatsApp
  orders only until paid.
- The badge shows on every trial site regardless of tier.
- Owner can change tier any time before paying.

### Abuse limits (low friction)

Implemented in `src/lib/billing/signupGuard.server.ts`, signals stored in `signup_signals`.

1. **Email normalisation** — lowercase; for Gmail/Googlemail strip dots and `+tag`; any domain strips `+tag`.
   One trial per normalised email. Disposable domains blocked (bundled list in `src/lib/billing/disposableDomains.ts`).
2. **Phone** — normalised to E.164 (`+234…`). One trial per phone; a duplicate does not block but flags the
   signup. Phone OTP can be added later behind the same interface (`verifyTrialContact`).
3. **Device marker** — signed httpOnly cookie set at trial start. A second trial from the same browser is flagged.
4. **Soft signals** — same business name + city, or same IP within 24h → flagged. IP never blocks on its own
   (carrier CGNAT, shared phones, cafés).
5. Flagged signups still get their site; they appear in `/admin/billing` with **Allow / Block**. Block pauses the
   site immediately.
6. Rate limits: signup and build endpoints limited per IP (e.g. 5 / hour) using an in-DB counter.

### One unpaid site per account

- An account may own at most one site whose subscription status is `trialing`, `past_due` or `paused`.
- When every owned site is `active` (or `manual`), "New site" in the dashboard opens the wizard without the
  account step. **No trial** for second and later sites: the site is built with subscription status `paused`
  (no `trial_ends_at`) and goes live on first payment.
- Enforced in `/api/signup/build` and by a DB function used in the insert path, not only in the UI.

### Lifecycle

Daily Vercel cron `GET /api/cron/billing` (protected by `CRON_SECRET`) sends emails and advances statuses.
Enforcement itself is lazy: public rendering and API gates read the subscription row.

| Day | Event |
| --- | --- |
| 0 | Welcome email + dashboard link |
| 5 | "2 days left — add a card to keep your site live" email + dashboard banner |
| 7 | `trialing` → `paused`. Public site shows a friendly "temporarily unavailable" page; dashboard still opens with a pay wall. |
| 28 | "Your site will be archived in 9 days" email |
| 37 | Site archived (existing soft archive). Admin can restore. |

## 3. Billing (Paystack Subscriptions)

### Plans

`billing_plans`: `id, tier, interval ('monthly'|'annually'), price_kobo, launch boolean, paystack_plan_code, active`.
3 tiers × 2 intervals × standard/launch = 12 Paystack plans, created by the idempotent script
`scripts/paystack-plans.mjs` from the pricing config (test keys first, then live). After the promo end date
launch plans are set `active = false`; existing launch subscribers keep their plan.

### Paying

From the dashboard ("Keep my site live" on trial, paused or past-due):

1. `POST /api/billing/checkout { siteId, planId }` — server checks the caller owns the site, looks up the
   amount in `billing_plans` (never from the client), calls Paystack `transaction/initialize` with
   `metadata: { kind: "subscription", siteId, planId }`, card channel only.
2. On `charge.success` for that reference: store the reusable authorization and customer code, then create the
   Paystack subscription with `start_date = max(now, trial_ends_at) + 1 interval`. Paying early keeps unused
   trial days.
3. Status → `active`, `current_period_end` set, site unpaused immediately.

### Webhook

Paystack allows one webhook URL per account and `/api/paystack/webhook` already handles platform shop
payments. Billing events go through the same route: events with `metadata.kind === "subscription"` and all
`subscription.*` / `invoice.*` events are dispatched to `src/lib/billing/webhook.server.ts`. Same HMAC-SHA512
signature check. Idempotent via `billing_events` (unique Paystack reference / event id).

| Paystack event | Status change |
| --- | --- |
| `charge.success` (first payment) | create subscription, `active` |
| `charge.success` (renewal) | `active`, extend `current_period_end` |
| `invoice.payment_failed` | `past_due`; 3-day grace with banner + email, then cron → `paused` |
| `subscription.not_renew` | `cancelling`; live until period end, then cron → `paused` |
| `subscription.disable` | `paused` |

Status state machine (`src/lib/billing/subscriptionState.ts`, pure, unit-tested):
`trialing → active | paused`, `active → past_due | cancelling`, `past_due → active | paused`,
`cancelling → active | paused`, `paused → active | archived`. `manual` is outside the machine and only changed
by admins.

### Owner Billing tab (`/dashboard/<siteId>/billing`)

Current plan and price, next charge date, change plan (any change: pay the new plan now; the new subscription
starts at max(now, trial end, current period end) so no paid days are lost), update card (Paystack `subscription/:code/manage/link`),
cancel (→ `cancelling`), payment history from `billing_events`, domain add-on request.

### Done for you

Sites are created by admins as today with status `manual` and a tier. The setup fee and recurring payments are
invoiced manually (Paystack payment page). No automation in this spec.

### Domain add-on

Owner requests from the Billing tab (or `/start`) with a desired name → `domain_requests` row + email to
Sulvatech. Admin checks availability, sends a Paystack payment link, buys and connects the domain with the
existing domain tooling, marks the request done with `renews_at`. The cron emails a renewal reminder 30 days
before `renews_at`.

## 4. Admin

Super admin only.

- `/admin/leads` — done-for-you briefs, status `new / contacted / won / lost`, notes.
- `/admin/billing` — subscriptions grouped by status, MRR (active subscriptions as monthly equivalent),
  trials ending within 48h, past-due list, flagged signups (Allow / Block), domain-request queue.
- Per site: set tier, set `manual`, extend trial by N days, unpause.

## Data

Migration `019_billing.sql` (run by the user in the Supabase SQL editor):

- `billing_plans` (above).
- `site_subscriptions`: `site_id (pk, fk sites)`, `owner_id`, `plan_id`, `tier`, `status`
  (`trialing|active|past_due|cancelling|paused|archived|manual`), `trial_ends_at`, `current_period_end`,
  `grace_ends_at`, `paystack_customer_code`, `paystack_subscription_code`, `paystack_email_token`,
  `authorization_code` (service role only), `flagged boolean`, timestamps.
- `billing_events`: `id, site_id, kind, paystack_reference unique, amount_kobo, status, payload jsonb, created_at`.
- `leads`: brief fields + `status`, `notes`, timestamps.
- `domain_requests`: `site_id, desired_name, status, renews_at, notes`.
- `signup_signals`: `user_id, normalized_email, phone_e164, device_hash, ip_hash, business_key, flagged_reason`.
- Backfill: every existing site gets a `manual` / `commerce` subscription row.
- Check constraint on `sites.slug` against the reserved list.
- RLS: owners read their own site's subscription and events; all writes via service role. `leads`,
  `signup_signals`, `domain_requests` (except owner insert/read own) are admin-only.

## Configuration

- New env: `CRON_SECRET`. Existing: `PAYSTACK_SECRET_KEY`, Resend key, Supabase service role.
- `vercel.json` gains a daily cron for `/api/cron/billing`.
- Supabase: enable email OTP and add `{{ .Token }}` to the signup email template.
- Promo end date and prices: `src/lib/marketing/pricing.ts`.

## Testing

Node built-in runner (`npm test`, relative imports):

- Pricing math (launch rounding, annual, setup) and `planFeatures`.
- Subscription state machine: every allowed and rejected transition.
- Email normalisation, disposable-domain check, phone E.164 normalisation.
- Signup guard: one trial per email/phone, one unpaid site per account, flagging rules.
- Webhook dispatch with Paystack fixture payloads (shop vs billing routing, idempotency, bad signature).
- Reserved slugs.

Manual end-to-end with Paystack **test keys**: trial signup → pay on day 0 → renewal via Paystack test
subscription → failed payment → pause → pay again. Live keys only after this passes.

## Out of scope

- Phone OTP (Termii / WhatsApp Cloud / Twilio) — interface ready, provider later.
- Automated domain purchase.
- Proration.
- Automated done-for-you invoicing.
- Terms / Privacy / About pages (note: Paystack live activation asks for terms and a refund policy — needed
  before switching billing to live keys).
- Dark mode on marketing pages.

## Build order

1. Pricing config + `planFeatures` + reserved slugs (pure, tested).
2. Marketing pages: `/`, `/templates`, `/templates/[key]`, `/pricing`, `/start` + `/admin/leads`.
3. Migration 019 + subscription state machine + backfill.
4. Signup wizard + `/api/signup/build` + signup guard.
5. Paystack plans script, checkout, webhook dispatch, Billing tab.
6. Plan gates in API routes and UI.
7. Cron lifecycle + emails, `/admin/billing`.
8. Paystack test-mode end-to-end.
