# Public Site, Pricing, Self-Serve Trial and Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the platform's "Go to login" stub with a public marketing site (home, templates, pricing, done-for-you brief), a self-serve signup wizard with a 7-day free trial, and Paystack subscription billing with plan limits.

**Architecture:** One pure pricing config drives every price on the site, the Paystack plan script and the checkout. Subscription state lives in `site_subscriptions` (migration 019); a security-definer RPC `site_billing_state` lets public site layouts render a "paused" page or a badge, and pure gate functions guard shop, inbox, AI and staff routes. Billing events reuse the existing platform Paystack webhook and are dispatched to a new billing handler; a daily Vercel cron advances statuses and sends lifecycle emails.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + Auth OTP), Paystack (Transactions, Plans, Subscriptions), Resend REST API, Tailwind v4 with the koi tokens, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-08-public-site-pricing-design.md`

## Global Constraints

- Tests: `npm test` (Node built-in runner, `tests/*.test.mjs`). Any module a test imports must use **relative `.ts` imports only** (no `@/`). Server/UI files may use `@/`.
- Source files use CRLF. Edit with the Edit tool or Node scripts written to the scratchpad — never multi-line `sed`/`perl`.
- In CSS write only unprefixed `backdrop-filter` (or set it via inline `style`); Tailwind's `backdrop-blur` is not used.
- Prices in `pricing.ts` are **naira**; anything sent to Paystack or stored as `*_kobo` is naira × 100.
- Launch monthly = `ceil(standard / 3 / 500) * 500`; annual = `10 × monthly`; launch setup = `standard setup / 3`. Domain add-on is never discounted.
- Launch prices: Starter ₦3,500/mo, Business ₦7,000/mo, Commerce ₦12,000/mo. Standard: ₦10,000 / ₦20,000 / ₦35,000. Setup (done-for-you only): ₦150,000 / ₦300,000 / ₦450,000 standard, ₦50,000 / ₦100,000 / ₦150,000 launch.
- Promo end date is real: `PROMO_ENDS_AT = "2027-04-08T23:59:59+01:00"`, shown as "8 Apr 2027". Never a rolling countdown.
- Domain add-on: `.com` ₦25,000/yr, `.com.ng` ₦15,000/yr.
- Trial: 7 days, no card. Card checkout off while `trialing`. One unpaid site per account; only an account's first site gets a trial.
- Billing failures must **fail open**: if migration 019 has not run (missing table/RPC), every site behaves as today (live, no limits).
- Sites with no `site_subscriptions` row or status `manual` have no plan limits (existing + done-for-you sites).
- Brand: koi tokens (`bg-koi-paper`, `text-koi-ink`, `bg-koi-deep`, `text-koi-sea`, `text-koi-orange`), `font-sans` (Inter Tight), `font-serif italic` accent words. Light only. Layout must work at 375px with 16px gutters.
- Do **not** modify or stage the user's uncommitted domain work: `src/app/api/admin/sites/[siteId]/domains/`, `src/lib/customDomains.server.ts`, `src/lib/vercelDomains.ts`, `src/components/admin/site/DomainsSection.tsx`, `docs/VERCEL_DOMAIN_SETUP.md`, `tests/vercelDomains.test.mjs`, `tsconfig.tsbuildinfo`. Always `git add <explicit paths>`, never `git add -A` / `git add .`.
- Every commit message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- New env vars: `CRON_SECRET`, `SIGNUP_SECRET`, `SALES_NOTIFY_EMAIL`, `NEXT_PUBLIC_SALES_WHATSAPP` (optional). Existing: `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_PLATFORM_DOMAIN`, `NEXT_PUBLIC_SITE_ORIGIN`, `SUPABASE_SERVICE_ROLE_KEY`.
- Migration 019 is run by the user in the Supabase SQL editor. Ask them; do not assume it ran.

## File Map

Pure (unit-tested):
- `src/lib/marketing/pricing.ts` — tiers, prices, promo, plan ids, formatting
- `src/lib/marketing/content.ts` — FAQ, features, steps, template groups (copy only)
- `src/lib/marketing/leadInput.ts` — done-for-you brief validation
- `src/lib/billing/planFeatures.ts` — per-tier features, compare rows, AI limit
- `src/lib/billing/subscriptionState.ts` — statuses, transitions, `isLive`, sweep
- `src/lib/billing/gates.ts` — shop / inbox / staff gate messages, checkout mode under a plan
- `src/lib/billing/identity.ts` + `disposableDomains.ts` — email/phone normalisation
- `src/lib/billing/signupGuard.ts` — trial abuse decision, one-unpaid-site rule
- `src/lib/billing/reference.ts` — `SB-…` billing references
- `src/lib/billing/webhookEvents.ts` — Paystack event parsing, period dates
- `src/lib/billing/lifecycle.ts` — which lifecycle emails are due + their copy
- `src/lib/reservedSlugs.ts` — reserved slugs, `safeSlug`
- `src/lib/signup/fallbackSite.ts` — signup answers parsing, brief, sample personalisation
- `src/lib/signup/suggest.ts` — 3 template suggestions

Server:
- `supabase/migrations/019_billing.sql`
- `src/lib/billing/subscriptions.server.ts` — load subscription, owned sites
- `src/lib/billing/siteState.server.ts` — `site_billing_state` RPC (anon)
- `src/lib/billing/signupSignals.server.ts` — hashing, prior-signal counts
- `src/lib/billing/email.server.ts` — lifecycle + sales emails
- `src/lib/billing/paystackBilling.server.ts` — Paystack transaction/subscription calls
- `src/lib/billing/webhook.server.ts` — billing webhook handling + settle first charge
- `src/lib/signup/persistTrialSite.server.ts` — insert site, write content, publish
- `src/lib/supabase/requireUser.server.ts` — bearer-token user check
- Routes: `src/app/api/leads`, `src/app/api/signup/build`, `src/app/api/billing/checkout`, `src/app/api/billing/[siteId]`, `src/app/api/cron/billing`, `src/app/api/admin/leads`, `src/app/api/admin/billing`
- `scripts/paystack-plans.mjs`

UI:
- `src/components/marketing/*` (shell, thumbs, pricing table, lead form, signup wizard, demo bar)
- Pages: `src/app/page.tsx` (rewrite), `src/app/templates/page.tsx`, `src/app/templates/[key]/[[...page]]/page.tsx`, `src/app/pricing/page.tsx`, `src/app/start/page.tsx`, `src/app/signup/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
- `src/app/[slug]/layout.tsx`, `src/app/d/[hostname]/layout.tsx`, `src/components/site/SitePaused.tsx`, `src/components/site/SulvaBadge.tsx`
- `src/app/dashboard/[siteId]/billing/page.tsx`, `src/components/dashboard/BillingPanel.tsx`, `src/components/dashboard/TrialBanner.tsx`
- `src/app/admin/leads/page.tsx`, `src/app/admin/billing/page.tsx`

---

### Task 1: Pricing config, plan features, reserved slugs

**Files:**
- Create: `src/lib/marketing/pricing.ts`, `src/lib/billing/planFeatures.ts`, `src/lib/reservedSlugs.ts`
- Modify: `src/lib/ai/createSite.ts` (slug base line)
- Test: `tests/pricing.test.mjs`, `tests/planFeatures.test.mjs`, `tests/reservedSlugs.test.mjs`

**Interfaces:**
- Produces: `Tier`, `Interval`, `TIERS`, `INTERVALS`, `TRIAL_DAYS`, `PROMO_ENDS_AT`, `PLAN_INFO`, `DOMAIN_ADDONS`, `isTier`, `isInterval`, `isPromoActive(now?)`, `launchMonthly(n)`, `monthlyPrice(tier, launch)`, `intervalPrice(tier, interval, launch)`, `setupFee(tier, launch)`, `planId(tier, interval, launch)`, `parsePlanId(id)`, `formatNaira(n)`, `promoEndLabel()`, `offeredPlans(now)`, `monthlyEquivalentKobo(priceKobo, interval)`.
- Produces: `PlanFeatures`, `planFeatures(tier)`, `featuresForSite(sub)`, `effectiveAiLimit(role, sub, fallback)`, `COMPARE_ROWS`.
- Produces: `RESERVED_SLUGS`, `isReservedSlug(s)`, `safeSlug(raw, fallback?)`.

- [ ] **Step 1: Write the failing tests**

`tests/pricing.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIERS, intervalPrice, isPromoActive, launchMonthly, monthlyPrice, monthlyEquivalentKobo,
  offeredPlans, parsePlanId, planId, promoEndLabel, setupFee, formatNaira, PROMO_ENDS_AT,
} from "../src/lib/marketing/pricing.ts";

test("launch monthly is a third, rounded up to the nearest 500", () => {
  assert.equal(launchMonthly(10_000), 3_500);
  assert.equal(launchMonthly(20_000), 7_000);
  assert.equal(launchMonthly(35_000), 12_000);
  assert.deepEqual(TIERS.map((t) => monthlyPrice(t, true)), [3_500, 7_000, 12_000]);
  assert.deepEqual(TIERS.map((t) => monthlyPrice(t, false)), [10_000, 20_000, 35_000]);
});

test("annual is ten months", () => {
  assert.equal(intervalPrice("starter", "annually", true), 35_000);
  assert.equal(intervalPrice("commerce", "annually", false), 350_000);
  assert.equal(intervalPrice("business", "monthly", true), 7_000);
});

test("setup fee is a third during launch", () => {
  assert.deepEqual(TIERS.map((t) => setupFee(t, true)), [50_000, 100_000, 150_000]);
  assert.deepEqual(TIERS.map((t) => setupFee(t, false)), [150_000, 300_000, 450_000]);
});

test("promo window is inclusive of the end instant", () => {
  const end = Date.parse(PROMO_ENDS_AT);
  assert.equal(isPromoActive(new Date(end)), true);
  assert.equal(isPromoActive(new Date(end + 1)), false);
  assert.equal(promoEndLabel(), "8 Apr 2027");
});

test("plan ids round-trip and reject junk", () => {
  assert.equal(planId("business", "annually", true), "business-annually-launch");
  assert.deepEqual(parsePlanId("starter-monthly-standard"), { tier: "starter", interval: "monthly", launch: false });
  assert.equal(parsePlanId("gold-monthly-launch"), null);
  assert.equal(parsePlanId("starter-weekly-launch"), null);
  assert.equal(parsePlanId("starter-monthly-launch-x"), null);
  assert.equal(parsePlanId(42), null);
});

test("offered plans use launch prices only while the promo runs", () => {
  const during = offeredPlans(new Date("2026-11-01T00:00:00Z"));
  assert.equal(during.length, 6);
  assert.ok(during.every((p) => p.launch));
  const starter = during.find((p) => p.tier === "starter" && p.interval === "monthly");
  assert.deepEqual(starter, { id: "starter-monthly-launch", tier: "starter", interval: "monthly", launch: true, price: 3_500, standardPrice: 10_000 });
  assert.ok(offeredPlans(new Date("2027-05-01T00:00:00Z")).every((p) => !p.launch));
});

test("formatting and MRR helpers", () => {
  assert.equal(formatNaira(3_500), "₦3,500");
  assert.equal(formatNaira(1_234_567), "₦1,234,567");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(monthlyEquivalentKobo(1_200_000, "annually"), 100_000);
  assert.equal(monthlyEquivalentKobo(350_000, "monthly"), 350_000);
});
```

`tests/planFeatures.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { COMPARE_ROWS, effectiveAiLimit, featuresForSite, planFeatures } from "../src/lib/billing/planFeatures.ts";

test("tier features match the spec table", () => {
  assert.deepEqual(planFeatures("starter"), { badge: true, customDomain: false, businessData: false, insights: false, aiMonthly: 20, staffSeats: 0, shop: false });
  assert.deepEqual(planFeatures("business"), { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 100, staffSeats: 2, shop: false });
  assert.deepEqual(planFeatures("commerce"), { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 200, staffSeats: 5, shop: true });
});

test("manual, missing or unknown subscriptions have no plan limits", () => {
  assert.equal(featuresForSite(null), null);
  assert.equal(featuresForSite({ status: "manual", tier: "starter" }), null);
  assert.equal(featuresForSite({ status: "active", tier: "gold" }), null);
});

test("trial sites always show the badge", () => {
  assert.equal(featuresForSite({ status: "trialing", tier: "commerce" }).badge, true);
  assert.equal(featuresForSite({ status: "active", tier: "commerce" }).badge, false);
});

test("AI limit: admins unlimited, plans use their allowance, otherwise the fallback", () => {
  assert.equal(effectiveAiLimit("admin", { status: "active", tier: "starter" }, null), null);
  assert.equal(effectiveAiLimit("owner", { status: "active", tier: "business" }, 50), 100);
  assert.equal(effectiveAiLimit("owner", { status: "manual", tier: "starter" }, 50), 50);
  assert.equal(effectiveAiLimit("staff", null, 50), 50);
});

test("compare rows render for every tier", () => {
  for (const row of COMPARE_ROWS) {
    for (const t of ["starter", "business", "commerce"]) {
      const v = row.value(planFeatures(t));
      assert.ok(typeof v === "string" || typeof v === "boolean", row.label);
    }
  }
});
```

`tests/reservedSlugs.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { RESERVED_SLUGS, isReservedSlug, safeSlug } from "../src/lib/reservedSlugs.ts";

test("marketing routes are reserved", () => {
  for (const s of ["pricing", "templates", "signup", "start", "admin", "dashboard", "api", "login"]) assert.ok(isReservedSlug(s), s);
  assert.equal(isReservedSlug("adas-kitchen"), false);
  assert.ok(RESERVED_SLUGS.length >= 20);
});

test("safeSlug slugifies and steps around reserved names", () => {
  assert.equal(safeSlug("Ada's Kitchen!"), "adas-kitchen");
  assert.equal(safeSlug("Pricing"), "pricing-site");
  assert.equal(safeSlug("   "), "my-site");
  assert.equal(safeSlug("", "fallback"), "fallback");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/marketing/pricing.ts'` (and the other two new modules).

- [ ] **Step 3: Implement `src/lib/marketing/pricing.ts`**

```ts
// Single source of truth for Sulva Sites plans and prices (naira). Pure: relative imports only.

export type Tier = "starter" | "business" | "commerce";
export type Interval = "monthly" | "annually";

export const TIERS: readonly Tier[] = ["starter", "business", "commerce"];
export const INTERVALS: readonly Interval[] = ["monthly", "annually"];
export const TRIAL_DAYS = 7;

/** Launch pricing ends at the end of this day, Lagos time (launch date + 6 months). */
export const PROMO_ENDS_AT = "2027-04-08T23:59:59+01:00";

export type PlanInfo = { name: string; blurb: string; standardMonthly: number; standardSetup: number };

export const PLAN_INFO: Record<Tier, PlanInfo> = {
  starter: {
    name: "Starter",
    blurb: "A beautiful site with pages, a blog and a contact inbox.",
    standardMonthly: 10_000,
    standardSetup: 150_000,
  },
  business: {
    name: "Business",
    blurb: "Your own domain, the owner dashboard and Ask AI.",
    standardMonthly: 20_000,
    standardSetup: 300_000,
  },
  commerce: {
    name: "Commerce",
    blurb: "Sell online with Paystack card and WhatsApp checkout.",
    standardMonthly: 35_000,
    standardSetup: 450_000,
  },
};

/** We buy and manage the domain. Cost-based, never discounted. */
export const DOMAIN_ADDONS = [
  { tld: ".com", yearly: 25_000 },
  { tld: ".com.ng", yearly: 15_000 },
] as const;

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v);
}

export function isInterval(v: unknown): v is Interval {
  return typeof v === "string" && (INTERVALS as readonly string[]).includes(v);
}

export function isPromoActive(now: Date = new Date()): boolean {
  return now.getTime() <= Date.parse(PROMO_ENDS_AT);
}

/** A third of the standard price, rounded up to the nearest ₦500. */
export function launchMonthly(standardMonthly: number): number {
  return Math.ceil(standardMonthly / 3 / 500) * 500;
}

export function monthlyPrice(tier: Tier, launch: boolean): number {
  const std = PLAN_INFO[tier].standardMonthly;
  return launch ? launchMonthly(std) : std;
}

/** Annual = 10 × monthly (two months free). */
export function intervalPrice(tier: Tier, interval: Interval, launch: boolean): number {
  const m = monthlyPrice(tier, launch);
  return interval === "annually" ? m * 10 : m;
}

/** One-time setup fee, done-for-you only. */
export function setupFee(tier: Tier, launch: boolean): number {
  const std = PLAN_INFO[tier].standardSetup;
  return launch ? Math.round(std / 3) : std;
}

export function planId(tier: Tier, interval: Interval, launch: boolean): string {
  return `${tier}-${interval}-${launch ? "launch" : "standard"}`;
}

export function parsePlanId(id: unknown): { tier: Tier; interval: Interval; launch: boolean } | null {
  if (typeof id !== "string") return null;
  const parts = id.split("-");
  if (parts.length !== 3) return null;
  const [tier, interval, kind] = parts;
  if (!isTier(tier) || !isInterval(interval) || (kind !== "launch" && kind !== "standard")) return null;
  return { tier, interval, launch: kind === "launch" };
}

export type OfferedPlan = { id: string; tier: Tier; interval: Interval; launch: boolean; price: number; standardPrice: number };

/** The plans a new subscription can pick right now (launch prices while the promo runs). */
export function offeredPlans(now: Date = new Date()): OfferedPlan[] {
  const launch = isPromoActive(now);
  const out: OfferedPlan[] = [];
  for (const tier of TIERS) {
    for (const interval of INTERVALS) {
      out.push({
        id: planId(tier, interval, launch),
        tier,
        interval,
        launch,
        price: intervalPrice(tier, interval, launch),
        standardPrice: intervalPrice(tier, interval, false),
      });
    }
  }
  return out;
}

export function monthlyEquivalentKobo(priceKobo: number, interval: Interval): number {
  return interval === "annually" ? Math.round(priceKobo / 12) : priceKobo;
}

export function formatNaira(n: number): string {
  const whole = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₦${whole}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "8 Apr 2027" — the promo end date in Lagos time (UTC+1, no DST). */
export function promoEndLabel(): string {
  const d = new Date(Date.parse(PROMO_ENDS_AT) + 60 * 60 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
```

- [ ] **Step 4: Implement `src/lib/billing/planFeatures.ts`**

```ts
// What each plan includes. Pure: relative imports only.
import { isTier, type Tier } from "../marketing/pricing.ts";

export type PlanFeatures = {
  badge: boolean;
  customDomain: boolean;
  businessData: boolean;
  insights: boolean;
  aiMonthly: number;
  staffSeats: number;
  shop: boolean;
};

const FEATURES: Record<Tier, PlanFeatures> = {
  starter: { badge: true, customDomain: false, businessData: false, insights: false, aiMonthly: 20, staffSeats: 0, shop: false },
  business: { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 100, staffSeats: 2, shop: false },
  commerce: { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 200, staffSeats: 5, shop: true },
};

export function planFeatures(tier: Tier): PlanFeatures {
  return { ...FEATURES[tier] };
}

export type SubLike = { status: string; tier: string } | null | undefined;

/**
 * The features a site may use, or null when it has no plan limits
 * (no subscription row, an admin-managed `manual` site, or an unknown tier).
 */
export function featuresForSite(sub: SubLike): PlanFeatures | null {
  if (!sub || sub.status === "manual" || !isTier(sub.tier)) return null;
  const f = planFeatures(sub.tier);
  return sub.status === "trialing" ? { ...f, badge: true } : f;
}

/** Monthly Ask AI allowance: admins keep `fallback` (null = unlimited); plan sites use their tier. */
export function effectiveAiLimit(role: string, sub: SubLike, fallback: number | null): number | null {
  if (role === "admin") return fallback;
  const f = featuresForSite(sub);
  return f ? f.aiMonthly : fallback;
}

export type CompareRow = { label: string; value: (f: PlanFeatures) => string | boolean };

export const COMPARE_ROWS: CompareRow[] = [
  { label: "All 17 templates, pages and a blog", value: () => true },
  { label: "Contact form inbox with email alerts", value: () => true },
  { label: "Free yourname.sulvasites.sulvatech.com address", value: () => true },
  { label: "Connect a domain you own", value: (f) => f.customDomain },
  { label: "No “Built with Sulva Sites” badge", value: (f) => !f.badge },
  { label: "Owner dashboard: business data and insights", value: (f) => f.businessData },
  { label: "Ask AI edits per month", value: (f) => String(f.aiMonthly) },
  { label: "Staff seats", value: (f) => (f.staffSeats > 0 ? String(f.staffSeats) : false) },
  { label: "Online shop or food ordering (Paystack + WhatsApp)", value: (f) => f.shop },
];
```

- [ ] **Step 5: Implement `src/lib/reservedSlugs.ts`**

```ts
// Slugs a client site may not use: they are platform routes on the root domain. Pure.
// Keep in sync with the sites_slug_not_reserved check in supabase/migrations/019_billing.sql (tested).
import { slugify } from "./slugify.ts";

export const RESERVED_SLUGS = [
  "about", "admin", "api", "blog", "change-password", "contact", "d", "dashboard", "dev",
  "forgot-password", "help", "login", "no-access", "pricing", "privacy", "signup", "start",
  "templates", "terms", "www",
] as const;

const SET: ReadonlySet<string> = new Set(RESERVED_SLUGS);

export function isReservedSlug(s: string): boolean {
  return SET.has(s);
}

/** slugify + fallback, then append "-site" when the result is reserved. */
export function safeSlug(raw: string, fallback = "my-site"): string {
  const s = slugify(raw) || fallback;
  return isReservedSlug(s) ? `${s}-site` : s;
}
```

- [ ] **Step 6: Use `safeSlug` in the admin builder**

In `src/lib/ai/createSite.ts` replace

```ts
  const base = slugify(desiredSlug) || "my-site";
```

with

```ts
  const base = safeSlug(desiredSlug);
```

and replace the `import { slugify } from "@/lib/slugify";` line with `import { safeSlug } from "@/lib/reservedSlugs";`. Then run `rg -n 'from\("sites"\)' src --glob '!**/*.test.*'` and check every `.insert(` on `sites` builds its slug through `safeSlug` (only `createSite.ts` is expected).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites, including the three new ones).

- [ ] **Step 8: Typecheck and commit**

Run: `npm run typecheck` — Expected: no new errors in the touched files.

```bash
git add src/lib/marketing/pricing.ts src/lib/billing/planFeatures.ts src/lib/reservedSlugs.ts src/lib/ai/createSite.ts tests/pricing.test.mjs tests/planFeatures.test.mjs tests/reservedSlugs.test.mjs
git commit -m "Pricing config, plan features and reserved slugs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Subscription state machine and gates

**Files:**
- Create: `src/lib/billing/subscriptionState.ts`, `src/lib/billing/gates.ts`
- Test: `tests/subscriptionState.test.mjs`, `tests/billingGates.test.mjs`

**Interfaces:**
- Consumes: `featuresForSite(sub)` (Task 1); `CheckoutMode` from `src/lib/shop/checkoutMode.ts`.
- Produces: `SubStatus`, `SUB_STATUSES`, `SubSnapshot`, `isSubStatus`, `canTransition(from, to)`, `isLive(s, nowMs)`, `sweepStatus(s, nowMs)`, `isUnpaid(status)`, `daysLeft(iso, nowMs)`, `GRACE_DAYS`, `ARCHIVE_AFTER_PAUSE_DAYS`, `DAY_MS`.
- Produces: `shopGateMessage(sub, kind, nowMs)`, `siteGateMessage(sub, nowMs)`, `staffGateMessage(sub, currentStaff)`, `planCheckoutMode(mode, billing)`.

- [ ] **Step 1: Write the failing tests**

`tests/subscriptionState.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { DAY_MS, canTransition, daysLeft, isLive, isUnpaid, sweepStatus } from "../src/lib/billing/subscriptionState.ts";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const sub = (over = {}) => ({
  status: "trialing", tier: "business", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, ...over,
});

test("transitions", () => {
  assert.ok(canTransition("trialing", "active"));
  assert.ok(canTransition("trialing", "paused"));
  assert.ok(canTransition("active", "past_due"));
  assert.ok(canTransition("past_due", "active"));
  assert.ok(canTransition("cancelling", "paused"));
  assert.ok(canTransition("paused", "archived"));
  assert.ok(canTransition("archived", "active"));
  assert.equal(canTransition("active", "trialing"), false);
  assert.equal(canTransition("manual", "paused"), false);
  assert.equal(canTransition("archived", "trialing"), false);
});

test("isLive", () => {
  assert.equal(isLive(sub({ status: "manual" }), NOW), true);
  assert.equal(isLive(sub({ status: "active" }), NOW), true);
  assert.equal(isLive(sub({ trial_ends_at: iso(NOW + 1000) }), NOW), true);
  assert.equal(isLive(sub({ trial_ends_at: iso(NOW - 1000) }), NOW), false);
  assert.equal(isLive(sub({ status: "past_due", grace_ends_at: iso(NOW + DAY_MS) }), NOW), true);
  assert.equal(isLive(sub({ status: "past_due", grace_ends_at: null }), NOW), false);
  assert.equal(isLive(sub({ status: "cancelling", current_period_end: iso(NOW + 1) }), NOW), true);
  assert.equal(isLive(sub({ status: "paused" }), NOW), false);
  assert.equal(isLive(sub({ status: "active", blocked: true }), NOW), false);
});

test("sweepStatus", () => {
  assert.equal(sweepStatus(sub({ trial_ends_at: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ trial_ends_at: iso(NOW + 1) }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "past_due", grace_ends_at: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ status: "cancelling", current_period_end: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ status: "paused", paused_at: iso(NOW - 30 * DAY_MS) }), NOW), "archived");
  assert.equal(sweepStatus(sub({ status: "paused", paused_at: iso(NOW - 29 * DAY_MS) }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "active" }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "manual" }), NOW), null);
});

test("unpaid statuses and days left", () => {
  assert.deepEqual(["trialing", "past_due", "paused", "active", "cancelling", "manual", "archived"].map(isUnpaid), [true, true, true, false, false, false, false]);
  assert.equal(daysLeft(iso(NOW + 2.2 * DAY_MS), NOW), 3);
  assert.equal(daysLeft(iso(NOW - DAY_MS), NOW), 0);
  assert.equal(daysLeft(null, NOW), 0);
});
```

`tests/billingGates.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { planCheckoutMode, shopGateMessage, siteGateMessage, staffGateMessage } from "../src/lib/billing/gates.ts";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const future = new Date(NOW + 86_400_000).toISOString();
const sub = (over = {}) => ({
  status: "active", tier: "commerce", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, ...over,
});

test("shop gate", () => {
  assert.equal(shopGateMessage(null, "card", NOW), null);
  assert.equal(shopGateMessage(sub({ status: "manual", tier: "starter" }), "card", NOW), null);
  assert.equal(shopGateMessage(sub(), "card", NOW), null);
  assert.match(shopGateMessage(sub({ status: "paused" }), "whatsapp", NOW), /isn't taking orders/);
  assert.match(shopGateMessage(sub({ tier: "business" }), "whatsapp", NOW), /isn't included/);
  assert.match(shopGateMessage(sub({ status: "trialing", trial_ends_at: future }), "card", NOW), /order on WhatsApp/);
  assert.equal(shopGateMessage(sub({ status: "trialing", trial_ends_at: future }), "whatsapp", NOW), null);
});

test("site gate (inbox)", () => {
  assert.equal(siteGateMessage(null, NOW), null);
  assert.equal(siteGateMessage(sub(), NOW), null);
  assert.match(siteGateMessage(sub({ status: "paused" }), NOW), /isn't accepting messages/);
});

test("staff gate", () => {
  assert.equal(staffGateMessage(null, 10), null);
  assert.match(staffGateMessage(sub({ tier: "starter" }), 0), /doesn't include staff/);
  assert.equal(staffGateMessage(sub({ tier: "business" }), 1), null);
  assert.match(staffGateMessage(sub({ tier: "business" }), 2), /includes 2 staff seats/);
});

test("checkout mode under a plan", () => {
  assert.equal(planCheckoutMode("card", { status: null, tier: null }), "card");
  assert.equal(planCheckoutMode("card", { status: "manual", tier: "starter" }), "card");
  assert.equal(planCheckoutMode("card_and_whatsapp", { status: "active", tier: "business" }), null);
  assert.equal(planCheckoutMode("card_and_whatsapp", { status: "trialing", tier: "commerce" }), "whatsapp");
  assert.equal(planCheckoutMode("card", { status: "active", tier: "commerce" }), "card");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find `subscriptionState.ts` / `gates.ts`.

- [ ] **Step 3: Implement `src/lib/billing/subscriptionState.ts`**

```ts
// Subscription status rules shared by the webhook, cron, gates and UI. Pure: relative imports only.
// isLive() must match public.site_billing_state() in supabase/migrations/019_billing.sql.

export type SubStatus = "trialing" | "active" | "past_due" | "cancelling" | "paused" | "archived" | "manual";

export const SUB_STATUSES: readonly SubStatus[] = ["trialing", "active", "past_due", "cancelling", "paused", "archived", "manual"];

export type SubSnapshot = {
  status: SubStatus;
  tier: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  paused_at: string | null;
  blocked: boolean;
};

export const DAY_MS = 86_400_000;
export const GRACE_DAYS = 3;
export const ARCHIVE_AFTER_PAUSE_DAYS = 30;

const ALLOWED: Record<SubStatus, readonly SubStatus[]> = {
  trialing: ["active", "paused"],
  active: ["past_due", "cancelling", "paused"],
  past_due: ["active", "paused"],
  cancelling: ["active", "paused"],
  paused: ["active", "archived"],
  archived: ["active", "paused"],
  manual: [],
};

export function isSubStatus(v: unknown): v is SubStatus {
  return typeof v === "string" && (SUB_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: SubStatus, to: SubStatus): boolean {
  return ALLOWED[from].includes(to);
}

function ms(iso: string | null): number {
  return iso ? Date.parse(iso) : NaN;
}

function after(iso: string | null, now: number): boolean {
  const t = ms(iso);
  return Number.isFinite(t) && t > now;
}

export function isLive(s: SubSnapshot, now: number): boolean {
  if (s.blocked) return false;
  switch (s.status) {
    case "manual":
    case "active":
      return true;
    case "trialing":
      return after(s.trial_ends_at, now);
    case "past_due":
      return after(s.grace_ends_at, now);
    case "cancelling":
      return after(s.current_period_end, now);
    default:
      return false;
  }
}

/** The status the daily sweep moves a subscription to, or null to leave it alone. */
export function sweepStatus(s: SubSnapshot, now: number): SubStatus | null {
  switch (s.status) {
    case "trialing":
      return after(s.trial_ends_at, now) ? null : "paused";
    case "past_due":
      return after(s.grace_ends_at, now) ? null : "paused";
    case "cancelling":
      return after(s.current_period_end, now) ? null : "paused";
    case "paused": {
      const p = ms(s.paused_at);
      return Number.isFinite(p) && now - p >= ARCHIVE_AFTER_PAUSE_DAYS * DAY_MS ? "archived" : null;
    }
    default:
      return null;
  }
}

/** Statuses that block an account from starting another site. */
export function isUnpaid(status: SubStatus): boolean {
  return status === "trialing" || status === "past_due" || status === "paused";
}

export function daysLeft(iso: string | null, now: number): number {
  const t = ms(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - now) / DAY_MS));
}
```

- [ ] **Step 4: Implement `src/lib/billing/gates.ts`**

```ts
// Plan/billing gates for public and owner routes. Pure: relative imports only.
import type { CheckoutMode } from "../shop/checkoutMode.ts";
import { featuresForSite } from "./planFeatures.ts";
import { isLive, type SubSnapshot } from "./subscriptionState.ts";

/** Why a shop order must be refused, or null to allow it. `null` sub = no plan limits. */
export function shopGateMessage(sub: SubSnapshot | null, kind: "card" | "whatsapp", now: number): string | null {
  if (!sub || sub.status === "manual") return null;
  if (!isLive(sub, now)) return "This shop isn't taking orders right now.";
  const f = featuresForSite(sub);
  if (f && !f.shop) return "Online ordering isn't included in this site's plan.";
  if (kind === "card" && sub.status === "trialing") {
    return "Card payments start once this shop's plan is active. Please order on WhatsApp.";
  }
  return null;
}

/** Contact forms and other visitor actions on a paused site. */
export function siteGateMessage(sub: SubSnapshot | null, now: number): string | null {
  if (!sub || isLive(sub, now)) return null;
  return "This site isn't accepting messages right now.";
}

export function staffGateMessage(sub: SubSnapshot | null, currentStaff: number): string | null {
  const f = featuresForSite(sub);
  if (!f || currentStaff < f.staffSeats) return null;
  return f.staffSeats === 0
    ? "Your plan doesn't include staff seats. Upgrade to Business to add staff."
    : `Your plan includes ${f.staffSeats} staff seats. Upgrade to add more.`;
}

/** The checkout mode a storefront may show under its plan; null = no shop on this plan. */
export function planCheckoutMode(
  mode: CheckoutMode,
  billing: { status: string | null; tier: string | null },
): CheckoutMode | null {
  if (!billing.status || billing.status === "manual") return mode;
  if (billing.tier !== "commerce") return null;
  if (billing.status === "trialing") return "whatsapp";
  return mode;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing/subscriptionState.ts src/lib/billing/gates.ts tests/subscriptionState.test.mjs tests/billingGates.test.mjs
git commit -m "Billing: subscription state machine and plan gates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Identity normalisation and signup guard

**Files:**
- Create: `src/lib/billing/disposableDomains.ts`, `src/lib/billing/identity.ts`, `src/lib/billing/signupGuard.ts`
- Test: `tests/billingIdentity.test.mjs`, `tests/signupGuard.test.mjs`

**Interfaces:**
- Consumes: `isUnpaid`, `SubStatus` (Task 2).
- Produces: `DISPOSABLE_DOMAINS`, `normalizeEmail(raw)`, `emailDomain(email)`, `isDisposableEmail(email, list?)`, `normalizePhoneNg(raw)`, `businessKey(name, city)`.
- Produces: `PriorSignals`, `GuardResult`, `IP_HOURLY_LIMIT`, `evaluateTrialSignup({ email, disposable, prior })`, `SiteStartDecision`, `canStartSite(owned)`.

- [ ] **Step 1: Write the failing tests**

`tests/billingIdentity.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { businessKey, isDisposableEmail, normalizeEmail, normalizePhoneNg } from "../src/lib/billing/identity.ts";

test("normalizeEmail", () => {
  assert.equal(normalizeEmail("  Ada.Okafor+shop@Gmail.com "), "adaokafor@gmail.com");
  assert.equal(normalizeEmail("a.b@googlemail.com"), "ab@gmail.com");
  assert.equal(normalizeEmail("ada.okafor+x@yahoo.com"), "ada.okafor@yahoo.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("+tag@gmail.com"), null);
  assert.equal(normalizeEmail(7), null);
});

test("disposable domains, including subdomains", () => {
  assert.equal(isDisposableEmail("x@mailinator.com"), true);
  assert.equal(isDisposableEmail("x@eu.mailinator.com"), true);
  assert.equal(isDisposableEmail("x@gmail.com"), false);
});

test("normalizePhoneNg", () => {
  for (const raw of ["08031234567", "+2348031234567", "2348031234567", "+234 0803 123 4567", "00234 803 123 4567", "803-123-4567"]) {
    assert.equal(normalizePhoneNg(raw), "+2348031234567", raw);
  }
  assert.equal(normalizePhoneNg("0603123456"), null);
  assert.equal(normalizePhoneNg("+447700900123"), null);
  assert.equal(normalizePhoneNg(""), null);
});

test("businessKey ignores case, punctuation and spacing", () => {
  assert.equal(businessKey("Ada's  Kitchen", " Lagos "), businessKey("adas kitchen", "LAGOS"));
  assert.notEqual(businessKey("Ada's Kitchen", "Lagos"), businessKey("Ada's Kitchen", "Abuja"));
});
```

`tests/signupGuard.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { canStartSite, evaluateTrialSignup } from "../src/lib/billing/signupGuard.ts";

const prior = (over = {}) => ({ emailTrials: 0, phoneTrials: 0, deviceTrials: 0, businessMatches: 0, ipLastHour: 0, ipLastDay: 0, ...over });

test("hard denials", () => {
  assert.equal(evaluateTrialSignup({ email: null, disposable: false, prior: prior() }).allow, false);
  const disposable = evaluateTrialSignup({ email: "a@mailinator.com", disposable: true, prior: prior() });
  assert.deepEqual([disposable.allow, disposable.status], [false, 400]);
  const reused = evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior({ emailTrials: 1 }) });
  assert.deepEqual([reused.allow, reused.status], [false, 409]);
  const burst = evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior({ ipLastHour: 5 }) });
  assert.deepEqual([burst.allow, burst.status], [false, 429]);
});

test("soft signals only flag", () => {
  const r = evaluateTrialSignup({
    email: "a@gmail.com", disposable: false,
    prior: prior({ phoneTrials: 1, deviceTrials: 1, businessMatches: 1, ipLastDay: 1 }),
  });
  assert.equal(r.allow, true);
  assert.deepEqual(r.flags, ["phone_reused", "device_reused", "business_match", "ip_repeat"]);
  assert.deepEqual(evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior() }), { allow: true, flags: [] });
});

test("one unpaid site per account; only the first site gets a trial", () => {
  assert.deepEqual(canStartSite([]), { ok: true, trial: true });
  assert.deepEqual(canStartSite([{ status: "active" }, { status: "manual" }]), { ok: true, trial: false });
  assert.deepEqual(canStartSite([{ status: "archived" }]), { ok: true, trial: false });
  const blocked = canStartSite([{ status: "active" }, { status: "paused", businessName: "Ada's Kitchen" }]);
  assert.deepEqual(blocked, { ok: false, error: "Activate Ada's Kitchen before adding another site." });
  assert.equal(canStartSite([{ status: "trialing" }]).ok, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/lib/billing/disposableDomains.ts`**

```ts
// Throwaway-inbox domains refused for free trials. Subdomains match too. Pure.
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com", "10minutemail.net", "1secmail.com", "1secmail.net", "burnermail.io",
  "discard.email", "dispostable.com", "emailfake.com", "emailondeck.com", "fakeinbox.com",
  "getnada.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.net", "inboxkitten.com",
  "mail.tm", "mailcatch.com", "maildrop.cc", "mailinator.com", "mailnesia.com", "mintemail.com",
  "moakt.com", "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com", "spamgourmet.com",
  "temp-mail.io", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "tempr.email",
  "throwawaymail.com", "tmail.ws", "trashmail.com", "yopmail.com", "yopmail.fr",
]);
```

- [ ] **Step 4: Implement `src/lib/billing/identity.ts`**

```ts
// Normalises the identity signals used to stop repeat free trials. Pure: no Node APIs (also used in the browser).
import { DISPOSABLE_DOMAINS } from "./disposableDomains.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GMAIL = new Set(["gmail.com", "googlemail.com"]);

/** Lowercase, strip "+tag"; for Gmail also strip dots. Null when not an email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length > 254 || !EMAIL_RE.test(e)) return null;
  const at = e.lastIndexOf("@");
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL.has(domain)) {
    local = local.split(".").join("");
    domain = "gmail.com";
  }
  return local ? `${local}@${domain}` : null;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isDisposableEmail(email: string, list: ReadonlySet<string> = DISPOSABLE_DOMAINS): boolean {
  const d = emailDomain(email);
  if (list.has(d)) return true;
  for (const x of list) if (d.endsWith(`.${x}`)) return true;
  return false;
}

/** Nigerian mobile number → "+234XXXXXXXXXX", else null. */
export function normalizePhoneNg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[789]\d{9}$/.test(d) ? `+234${d}` : null;
}

function clean(s: string): string {
  return s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function businessKey(name: string, city: string): string {
  return `${clean(name)}|${clean(city)}`;
}
```

- [ ] **Step 5: Implement `src/lib/billing/signupGuard.ts`**

```ts
// Free-trial abuse rules. Hard denials are rare; everything else only flags for admin review. Pure.
import { isUnpaid, type SubStatus } from "./subscriptionState.ts";

export type PriorSignals = {
  emailTrials: number;
  phoneTrials: number;
  deviceTrials: number;
  businessMatches: number;
  ipLastHour: number;
  ipLastDay: number;
};

export type GuardResult = { allow: true; flags: string[] } | { allow: false; status: number; error: string };

export const IP_HOURLY_LIMIT = 5;

export function evaluateTrialSignup(input: { email: string | null; disposable: boolean; prior: PriorSignals }): GuardResult {
  const { prior } = input;
  if (!input.email) return { allow: false, status: 400, error: "Enter a valid email address." };
  if (input.disposable) {
    return { allow: false, status: 400, error: "Please use a permanent email address, not a temporary inbox." };
  }
  if (prior.ipLastHour >= IP_HOURLY_LIMIT) {
    return { allow: false, status: 429, error: "Too many new sites from this network. Try again in an hour." };
  }
  if (prior.emailTrials > 0) {
    return { allow: false, status: 409, error: "This email has already used its free trial. Sign in to continue with your site." };
  }
  const flags: string[] = [];
  if (prior.phoneTrials > 0) flags.push("phone_reused");
  if (prior.deviceTrials > 0) flags.push("device_reused");
  if (prior.businessMatches > 0) flags.push("business_match");
  if (prior.ipLastDay > 0) flags.push("ip_repeat");
  return { allow: true, flags };
}

export type SiteStartDecision = { ok: true; trial: boolean } | { ok: false; error: string };

/** One unpaid site per account. Only an account's very first site (archived ones count) gets a trial. */
export function canStartSite(owned: Array<{ status: SubStatus; businessName?: string | null }>): SiteStartDecision {
  const blocking = owned.find((o) => isUnpaid(o.status));
  if (blocking) {
    return { ok: false, error: `Activate ${blocking.businessName || "your current site"} before adding another site.` };
  }
  return { ok: true, trial: owned.length === 0 };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/billing/disposableDomains.ts src/lib/billing/identity.ts src/lib/billing/signupGuard.ts tests/billingIdentity.test.mjs tests/signupGuard.test.mjs
git commit -m "Billing: identity normalisation and trial signup guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Billing references and Paystack event parsing

**Files:**
- Create: `src/lib/billing/reference.ts`, `src/lib/billing/webhookEvents.ts`
- Test: `tests/billingWebhookEvents.test.mjs`

**Interfaces:**
- Consumes: `Interval` (Task 1).
- Produces: `BILLING_REFERENCE_RE`, `newBillingReference(now?, rand?)`, `isBillingReference(v)`.
- Produces: `BillingEvent` union (`first_charge` | `invoice_paid` | `payment_failed` | `not_renew` | `disabled` | `ignore`), `isBillingWebhook(event)`, `parseBillingEvent(event)`, `addInterval(date, interval)`, `subscriptionStartDate(now, trialEndsAt, currentPeriodEnd, interval)`.

- [ ] **Step 1: Write the failing test**

`tests/billingWebhookEvents.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { isBillingReference, newBillingReference } from "../src/lib/billing/reference.ts";
import { addInterval, isBillingWebhook, parseBillingEvent, subscriptionStartDate } from "../src/lib/billing/webhookEvents.ts";

const REF = newBillingReference(Date.parse("2026-11-10T00:00:00Z"), () => 0);

test("billing references", () => {
  assert.match(REF, /^SB-[0-9A-Z]+-AAAAAA$/);
  assert.ok(isBillingReference(REF));
  assert.equal(isBillingReference("SV-ABC123-ABCDEF"), false);
  assert.equal(isBillingReference(null), false);
});

test("routing: billing vs shop", () => {
  assert.ok(isBillingWebhook({ event: "charge.success", data: { reference: REF } }));
  assert.ok(isBillingWebhook({ event: "charge.success", data: { reference: "x", metadata: JSON.stringify({ kind: "subscription" }) } }));
  assert.ok(isBillingWebhook({ event: "invoice.update", data: {} }));
  assert.ok(isBillingWebhook({ event: "subscription.disable", data: {} }));
  assert.equal(isBillingWebhook({ event: "charge.success", data: { reference: "SV-ABC123-ABCDEF" } }), false);
  assert.equal(isBillingWebhook({ event: "transfer.success", data: {} }), false);
  assert.equal(isBillingWebhook(null), false);
});

test("first charge", () => {
  const ev = parseBillingEvent({
    event: "charge.success",
    data: {
      reference: REF, amount: 350000, currency: "NGN",
      customer: { customer_code: "CUS_1", email: "ada@example.com" },
      authorization: { authorization_code: "AUTH_1", reusable: true },
      metadata: { kind: "subscription", siteId: "site-1", planId: "starter-monthly-launch" },
    },
  });
  assert.deepEqual(ev, {
    kind: "first_charge", reference: REF, amountKobo: 350000, currency: "NGN", customerCode: "CUS_1",
    authorizationCode: "AUTH_1", reusable: true, siteId: "site-1", planId: "starter-monthly-launch", email: "ada@example.com",
  });
});

test("subscription lifecycle events", () => {
  assert.deepEqual(
    parseBillingEvent({ event: "invoice.update", data: { paid: true, invoice_code: "INV_1", amount: 700000, subscription: { subscription_code: "SUB_1", next_payment_date: "2026-12-10T00:00:00.000Z" } } }),
    { kind: "invoice_paid", key: "invoice:INV_1", subscriptionCode: "SUB_1", nextPaymentDate: "2026-12-10T00:00:00.000Z", amountKobo: 700000 },
  );
  assert.equal(parseBillingEvent({ event: "invoice.update", data: { paid: false, subscription: { subscription_code: "SUB_1" } } }).kind, "ignore");
  assert.deepEqual(
    parseBillingEvent({ event: "invoice.payment_failed", data: { invoice_code: "INV_2", subscription: { subscription_code: "SUB_1" } } }),
    { kind: "payment_failed", key: "failed:INV_2", subscriptionCode: "SUB_1" },
  );
  assert.deepEqual(parseBillingEvent({ event: "subscription.not_renew", data: { subscription_code: "SUB_1" } }), { kind: "not_renew", key: "not_renew:SUB_1", subscriptionCode: "SUB_1" });
  assert.deepEqual(parseBillingEvent({ event: "subscription.disable", data: { subscription_code: "SUB_1" } }), { kind: "disabled", key: "disable:SUB_1", subscriptionCode: "SUB_1" });
  assert.equal(parseBillingEvent({ event: "subscription.create", data: { subscription_code: "SUB_1" } }).kind, "ignore");
  assert.equal(parseBillingEvent({ event: "charge.success", data: { reference: "nope" } }).kind, "ignore");
});

test("paid period starts after trial or paid time", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  assert.equal(addInterval(now, "monthly").toISOString(), "2026-12-10T00:00:00.000Z");
  assert.equal(addInterval(now, "annually").toISOString(), "2027-11-10T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, "2026-11-14T00:00:00Z", null, "monthly").toISOString(), "2026-12-14T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, "2026-11-01T00:00:00Z", null, "monthly").toISOString(), "2026-12-10T00:00:00.000Z");
  assert.equal(subscriptionStartDate(now, null, "2026-11-30T00:00:00Z", "monthly").toISOString(), "2026-12-30T00:00:00.000Z");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/lib/billing/reference.ts`**

```ts
// Paystack transaction references for subscription checkouts. Shop orders use "SV-…" (src/lib/shop/reference.ts).
import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RANDOM_LEN = 6;

export const BILLING_REFERENCE_RE = /^SB-[0-9A-Z]{6,12}-[0-9A-Z]{6}$/;

export function newBillingReference(
  now: number = Date.now(),
  rand: (max: number) => number = (max) => randomInt(max),
): string {
  const t = Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
  const time = t.toString(36).toUpperCase().padStart(6, "0");
  let suffix = "";
  for (let i = 0; i < RANDOM_LEN; i++) suffix += ALPHABET[rand(ALPHABET.length)];
  return `SB-${time}-${suffix}`;
}

export function isBillingReference(v: unknown): v is string {
  return typeof v === "string" && BILLING_REFERENCE_RE.test(v);
}
```

- [ ] **Step 4: Implement `src/lib/billing/webhookEvents.ts`**

```ts
// Parses Paystack webhook payloads for subscription billing. Pure: relative imports only.
// Renewals are taken from invoice.update (it names the subscription); renewal charge.success events
// carry no reference of ours and fall through to the shop handler, which ignores them.
import type { Interval } from "../marketing/pricing.ts";
import { isBillingReference } from "./reference.ts";

export type BillingEvent =
  | {
      kind: "first_charge";
      reference: string;
      amountKobo: number;
      currency: string;
      customerCode: string | null;
      authorizationCode: string | null;
      reusable: boolean;
      siteId: string | null;
      planId: string | null;
      email: string | null;
    }
  | { kind: "invoice_paid"; key: string; subscriptionCode: string; nextPaymentDate: string | null; amountKobo: number }
  | { kind: "payment_failed"; key: string; subscriptionCode: string }
  | { kind: "not_renew"; key: string; subscriptionCode: string }
  | { kind: "disabled"; key: string; subscriptionCode: string }
  | { kind: "ignore" };

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function metadataOf(data: Obj | null): Obj | null {
  const m = data?.metadata;
  if (typeof m === "string") {
    try {
      return obj(JSON.parse(m));
    } catch {
      return null;
    }
  }
  return obj(m);
}

/** True when the platform webhook should hand this event to billing instead of the shop. */
export function isBillingWebhook(event: unknown): boolean {
  const e = obj(event);
  const name = str(e?.event);
  if (!name) return false;
  if (name.startsWith("subscription.") || name.startsWith("invoice.")) return true;
  if (name === "charge.success") {
    const data = obj(e?.data);
    return isBillingReference(data?.reference) || metadataOf(data)?.kind === "subscription";
  }
  return false;
}

export function parseBillingEvent(event: unknown): BillingEvent {
  const e = obj(event);
  const name = str(e?.event);
  const data = obj(e?.data);
  if (!name || !data) return { kind: "ignore" };

  if (name === "charge.success") {
    const reference = data.reference;
    if (!isBillingReference(reference)) return { kind: "ignore" };
    const auth = obj(data.authorization);
    const cust = obj(data.customer);
    const meta = metadataOf(data);
    return {
      kind: "first_charge",
      reference,
      amountKobo: num(data.amount) ?? 0,
      currency: str(data.currency) ?? "",
      customerCode: str(cust?.customer_code),
      authorizationCode: str(auth?.authorization_code),
      reusable: auth?.reusable === true,
      siteId: str(meta?.siteId),
      planId: str(meta?.planId),
      email: str(cust?.email),
    };
  }

  const sub = name.startsWith("invoice.") ? obj(data.subscription) : data;
  const code = str(sub?.subscription_code);
  if (!code) return { kind: "ignore" };
  const invoice = str(data.invoice_code) ?? `${code}:${str(data.period_end) ?? ""}`;

  switch (name) {
    case "invoice.update":
      if (!(data.paid === true || data.status === "success")) return { kind: "ignore" };
      return {
        kind: "invoice_paid",
        key: `invoice:${invoice}`,
        subscriptionCode: code,
        nextPaymentDate: str(sub?.next_payment_date),
        amountKobo: num(data.amount) ?? 0,
      };
    case "invoice.payment_failed":
      return { kind: "payment_failed", key: `failed:${invoice}`, subscriptionCode: code };
    case "subscription.not_renew":
      return { kind: "not_renew", key: `not_renew:${code}`, subscriptionCode: code };
    case "subscription.disable":
      return { kind: "disabled", key: `disable:${code}`, subscriptionCode: code };
    default:
      return { kind: "ignore" };
  }
}

export function addInterval(d: Date, interval: Interval): Date {
  const r = new Date(d.getTime());
  if (interval === "annually") r.setUTCFullYear(r.getUTCFullYear() + 1);
  else r.setUTCMonth(r.getUTCMonth() + 1);
  return r;
}

/** End of the period just paid for: it starts after any trial or already-paid time, so no days are lost. */
export function subscriptionStartDate(
  now: Date,
  trialEndsAt: string | null,
  currentPeriodEnd: string | null,
  interval: Interval,
): Date {
  const candidates = [now.getTime()];
  for (const iso of [trialEndsAt, currentPeriodEnd]) {
    const t = iso ? Date.parse(iso) : NaN;
    if (Number.isFinite(t)) candidates.push(t);
  }
  return addInterval(new Date(Math.max(...candidates)), interval);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing/reference.ts src/lib/billing/webhookEvents.ts tests/billingWebhookEvents.test.mjs
git commit -m "Billing: references and Paystack event parsing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Migration 019 (billing tables, RPC, backfill, reserved slugs)

**Files:**
- Create: `supabase/migrations/019_billing.sql`
- Test: `tests/billingMigration.test.mjs`

**Interfaces:**
- Consumes: `RESERVED_SLUGS` (Task 1).
- Produces tables: `billing_plans`, `site_subscriptions`, `billing_secrets`, `billing_events`, `leads`, `domain_requests`, `signup_signals`; RPC `public.site_billing_state(p_site uuid) returns table(live boolean, badge boolean, tier text, status text)`.

Column contract later tasks rely on:
- `site_subscriptions`: `site_id` (pk), `owner_id`, `tier`, `interval`, `plan_id`, `status`, `trial_ends_at`, `current_period_end`, `grace_ends_at`, `paused_at`, `paystack_customer_code`, `paystack_subscription_code`, `flagged`, `blocked`, `emails_sent text[]`, `created_at`, `updated_at`.
- `billing_secrets`: `site_id`, `authorization_code`, `email_token`.
- `billing_events`: `id`, `site_id`, `event_key` (unique), `kind`, `plan_id`, `amount_kobo`, `status`, `summary jsonb`, `created_at`.
- `leads`: `id`, `name`, `email`, `phone`, `business`, `category`, `template_key`, `tier`, `domain`, `notes`, `status`, `admin_notes`, `created_at`, `updated_at`.
- `domain_requests`: `id`, `site_id`, `requested_by`, `desired_name`, `status`, `renews_at`, `renewal_reminded_at`, `notes`, `created_at`.
- `signup_signals`: `id`, `user_id`, `site_id`, `normalized_email`, `phone_e164`, `device_hash`, `ip_hash`, `business_key`, `flags text[]`, `created_at`.

- [ ] **Step 1: Write the failing test**

`tests/billingMigration.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { RESERVED_SLUGS } from "../src/lib/reservedSlugs.ts";
import { SUB_STATUSES } from "../src/lib/billing/subscriptionState.ts";

const sql = readFileSync(new URL("../supabase/migrations/019_billing.sql", import.meta.url), "utf8");

test("every reserved slug is in the DB check constraint", () => {
  const m = sql.match(/sites_slug_not_reserved[\s\S]*?array\[([\s\S]*?)\]/);
  assert.ok(m, "constraint not found");
  const inSql = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(inSql, [...RESERVED_SLUGS].sort());
});

test("status check matches the TypeScript statuses", () => {
  const m = sql.match(/status text not null check \(status in \(([^)]*)\)\)/);
  assert.ok(m);
  const inSql = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(inSql, [...SUB_STATUSES].sort());
});

test("RPC is callable by visitors and backfill keeps existing sites manual", () => {
  assert.match(sql, /grant execute on function public\.site_billing_state\(uuid\) to anon, authenticated/);
  assert.match(sql, /'commerce', 'manual'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL with `ENOENT ... 019_billing.sql`.

- [ ] **Step 3: Write `supabase/migrations/019_billing.sql`**

```sql
-- 019_billing.sql — public site + self-serve trial + Paystack subscription billing.
-- Spec: docs/superpowers/specs/2026-10-08-public-site-pricing-design.md. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Plans (filled by scripts/paystack-plans.mjs)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id text primary key,                                   -- e.g. 'business-monthly-launch'
  tier text not null check (tier in ('starter','business','commerce')),
  interval text not null check (interval in ('monthly','annually')),
  price_kobo bigint not null check (price_kobo > 0),
  launch boolean not null default false,
  paystack_plan_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.billing_plans enable row level security;
drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- One subscription row per site. No row (or status 'manual') = no plan limits.
-- ---------------------------------------------------------------------------
create table if not exists public.site_subscriptions (
  site_id uuid primary key references public.sites(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  tier text not null default 'starter' check (tier in ('starter','business','commerce')),
  interval text not null default 'monthly' check (interval in ('monthly','annually')),
  plan_id text references public.billing_plans(id),
  status text not null check (status in ('trialing','active','past_due','cancelling','paused','archived','manual')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  paused_at timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text unique,
  flagged text,
  blocked boolean not null default false,
  emails_sent text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_subscriptions_owner_idx on public.site_subscriptions(owner_id);
create index if not exists site_subscriptions_status_idx on public.site_subscriptions(status);
-- At most one running trial per account (the API also enforces one unpaid site).
create unique index if not exists site_subscriptions_one_trial_per_owner
  on public.site_subscriptions(owner_id) where status = 'trialing';

drop trigger if exists site_subscriptions_updated_at on public.site_subscriptions;
create trigger site_subscriptions_updated_at before update on public.site_subscriptions
  for each row execute function public.set_updated_at();

alter table public.site_subscriptions enable row level security;
drop policy if exists site_subscriptions_member_read on public.site_subscriptions;
create policy site_subscriptions_member_read on public.site_subscriptions
  for select to authenticated using (public.is_site_member(site_id));
-- All writes go through the service role (API routes, webhook, cron).

-- Card authorization + Paystack email token: service role only (RLS on, no policies).
create table if not exists public.billing_secrets (
  site_id uuid primary key references public.sites(id) on delete cascade,
  authorization_code text,
  email_token text,
  updated_at timestamptz not null default now()
);
alter table public.billing_secrets enable row level security;

-- ---------------------------------------------------------------------------
-- Checkouts + processed webhook events (idempotency via event_key)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete set null,
  event_key text not null unique,
  kind text not null,
  plan_id text,
  amount_kobo bigint,
  status text not null default 'done',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists billing_events_site_idx on public.billing_events(site_id, created_at desc);
alter table public.billing_events enable row level security;
drop policy if exists billing_events_member_read on public.billing_events;
create policy billing_events_member_read on public.billing_events
  for select to authenticated using (site_id is not null and public.is_site_member(site_id));

-- ---------------------------------------------------------------------------
-- Done-for-you briefs, domain add-on requests, signup signals (service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  business text not null,
  category text,
  template_key text,
  tier text,
  domain text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
alter table public.leads enable row level security;

create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  desired_name text not null,
  status text not null default 'requested' check (status in ('requested','quoted','paid','active','rejected')),
  renews_at date,
  renewal_reminded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists domain_requests_site_idx on public.domain_requests(site_id);
alter table public.domain_requests enable row level security;

create table if not exists public.signup_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  normalized_email text,
  phone_e164 text,
  device_hash text,
  ip_hash text,
  business_key text,
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists signup_signals_email_idx on public.signup_signals(normalized_email);
create index if not exists signup_signals_phone_idx on public.signup_signals(phone_e164);
create index if not exists signup_signals_device_idx on public.signup_signals(device_hash);
create index if not exists signup_signals_ip_idx on public.signup_signals(ip_hash, created_at desc);
create index if not exists signup_signals_business_idx on public.signup_signals(business_key);
alter table public.signup_signals enable row level security;

-- ---------------------------------------------------------------------------
-- Public billing state for site rendering. Must match isLive() in
-- src/lib/billing/subscriptionState.ts. No row => zero rows (caller treats as live).
-- ---------------------------------------------------------------------------
create or replace function public.site_billing_state(p_site uuid)
returns table (live boolean, badge boolean, tier text, status text)
language sql stable security definer set search_path = public as $$
  select
    (not s.blocked) and case s.status
      when 'manual' then true
      when 'active' then true
      when 'trialing' then coalesce(s.trial_ends_at > now(), false)
      when 'past_due' then coalesce(s.grace_ends_at > now(), false)
      when 'cancelling' then coalesce(s.current_period_end > now(), false)
      else false
    end,
    s.status <> 'manual' and (s.status = 'trialing' or s.tier = 'starter'),
    s.tier,
    s.status
  from public.site_subscriptions s
  where s.site_id = p_site;
$$;
revoke all on function public.site_billing_state(uuid) from public;
grant execute on function public.site_billing_state(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing sites: admin-managed, everything included.
-- ---------------------------------------------------------------------------
insert into public.site_subscriptions (site_id, owner_id, tier, status)
select s.id, null, 'commerce', 'manual' from public.sites s
on conflict (site_id) do nothing;

-- ---------------------------------------------------------------------------
-- Client sites may not take platform route names (keep in sync with src/lib/reservedSlugs.ts).
-- NOT VALID: existing rows are not re-checked.
-- ---------------------------------------------------------------------------
alter table public.sites drop constraint if exists sites_slug_not_reserved;
alter table public.sites add constraint sites_slug_not_reserved check (slug <> all (array[
  'about','admin','api','blog','change-password','contact','d','dashboard','dev',
  'forgot-password','help','login','no-access','pricing','privacy','signup','start',
  'templates','terms','www'
]::text[])) not valid;

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/019_billing.sql tests/billingMigration.test.mjs
git commit -m "Migration 019: billing plans, subscriptions, leads, signup signals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Ask the user to run the migration**

Tell the user: "Please run `supabase/migrations/019_billing.sql` in the Supabase SQL editor and tell me when it's done." Continue with Tasks 6–13 meanwhile (all code fails open without it); Task 14 onwards needs it for manual checks.

---

### Task 6: Lifecycle emails (copy + due rules) and email sender

**Files:**
- Create: `src/lib/billing/lifecycle.ts`, `src/lib/billing/email.server.ts`, `src/lib/billing/subscriptions.server.ts`
- Test: `tests/billingLifecycle.test.mjs`

**Interfaces:**
- Consumes: `SubSnapshot`, `daysLeft`, `DAY_MS` (Task 2); `sendResend`, `isNotifiable` from `src/lib/inbox/notify.ts`; `supabaseService` from `src/lib/supabase/admin.server.ts`.
- Produces (pure): `LifecycleKind = "welcome" | "trial_ending" | "paused" | "archive_warning" | "payment_failed"`, `ARCHIVE_WARNING_AFTER_PAUSE_DAYS = 21`, `emailsDue(sub, nowMs): string[]`, `emailKind(key): LifecycleKind | null`, `buildLifecycleEmail(kind, ctx)`.
- Produces (server): `SubscriptionRow`, `SUB_COLUMNS`, `loadSubscription(db, siteId): Promise<SubscriptionRow | null>`, `OwnedSite`, `listOwnedSites(db, userId): Promise<OwnedSite[]>`, `sendLifecycleEmail(db, siteId, key): Promise<boolean>`, `sendSalesEmail(subject, text): Promise<boolean>`, `platformOrigin(): string`.

- [ ] **Step 1: Write the failing test**

`tests/billingLifecycle.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLifecycleEmail, emailKind, emailsDue } from "../src/lib/billing/lifecycle.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-10T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const sub = (over = {}) => ({
  status: "trialing", tier: "business", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, emails_sent: [], ...over,
});

test("trial ending email from two days before the end", () => {
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + 2 * DAY) }), NOW), ["trial_ending"]);
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + 3 * DAY) }), NOW), []);
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + DAY), emails_sent: ["trial_ending"] }), NOW), []);
});

test("paused and archive warning are keyed by the pause date", () => {
  const pausedAt = iso(NOW - 22 * DAY);
  const day = pausedAt.slice(0, 10);
  assert.deepEqual(emailsDue(sub({ status: "paused", paused_at: pausedAt }), NOW), [`paused:${day}`, `archive_warning:${day}`]);
  assert.deepEqual(emailsDue(sub({ status: "paused", paused_at: iso(NOW - DAY) }), NOW), [`paused:${iso(NOW - DAY).slice(0, 10)}`]);
});

test("payment failed once per grace window", () => {
  const grace = iso(NOW + 2 * DAY);
  assert.deepEqual(emailsDue(sub({ status: "past_due", grace_ends_at: grace }), NOW), [`payment_failed:${grace.slice(0, 10)}`]);
  assert.deepEqual(emailsDue(sub({ status: "active" }), NOW), []);
});

test("kinds and copy", () => {
  assert.equal(emailKind("paused:2026-11-01"), "paused");
  assert.equal(emailKind("welcome"), "welcome");
  assert.equal(emailKind("nope"), null);
  const mail = buildLifecycleEmail("trial_ending", {
    businessName: "Ada's <Kitchen>", siteUrl: "https://ada.example.com", billingUrl: "https://x/billing", daysLeft: 2,
  });
  assert.match(mail.subject, /2 days left/);
  assert.match(mail.text, /https:\/\/x\/billing/);
  assert.match(mail.html, /Ada&#39;s &lt;Kitchen&gt;/);
  for (const k of ["welcome", "paused", "archive_warning", "payment_failed"]) {
    const m = buildLifecycleEmail(k, { businessName: "A", siteUrl: "https://a", billingUrl: "https://b", daysLeft: 0 });
    assert.ok(m.subject && m.text && m.html, k);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/billing/lifecycle.ts`**

```ts
// Which lifecycle emails a subscription is due, and their copy. Pure: relative imports only.
// Keys stored in site_subscriptions.emails_sent; some carry a date suffix so they repeat per pause/grace window.
import { DAY_MS, daysLeft, type SubSnapshot } from "./subscriptionState.ts";

export type LifecycleKind = "welcome" | "trial_ending" | "paused" | "archive_warning" | "payment_failed";

const KINDS: readonly LifecycleKind[] = ["welcome", "trial_ending", "paused", "archive_warning", "payment_failed"];

export const TRIAL_ENDING_NOTICE_DAYS = 2;
export const ARCHIVE_WARNING_AFTER_PAUSE_DAYS = 21;

export function emailsDue(s: SubSnapshot & { emails_sent: string[] }, now: number): string[] {
  const due: string[] = [];
  if (s.status === "trialing" && s.trial_ends_at) {
    const left = Date.parse(s.trial_ends_at) - now;
    if (left > 0 && left <= TRIAL_ENDING_NOTICE_DAYS * DAY_MS) due.push("trial_ending");
  }
  if (s.status === "paused" && s.paused_at) {
    const day = s.paused_at.slice(0, 10);
    due.push(`paused:${day}`);
    if (now - Date.parse(s.paused_at) >= ARCHIVE_WARNING_AFTER_PAUSE_DAYS * DAY_MS) due.push(`archive_warning:${day}`);
  }
  if (s.status === "past_due" && s.grace_ends_at) due.push(`payment_failed:${s.grace_ends_at.slice(0, 10)}`);
  return due.filter((k) => !s.emails_sent.includes(k));
}

export function emailKind(key: string): LifecycleKind | null {
  const k = key.split(":")[0] as LifecycleKind;
  return KINDS.includes(k) ? k : null;
}

export type LifecycleContext = { businessName: string; siteUrl: string; billingUrl: string; daysLeft: number };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function buildLifecycleEmail(kind: LifecycleKind, c: LifecycleContext): { subject: string; text: string; html: string } {
  const name = c.businessName.replace(/[\r\n]+/g, " ").trim() || "your site";
  const days = `${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;
  const copy: Record<LifecycleKind, { subject: string; lines: string[]; cta: string; url: string }> = {
    welcome: {
      subject: `${name} is live — your 7-day free trial has started`,
      lines: [`${name} is live at ${c.siteUrl}.`, "You have 7 days free to make it yours. No card needed until you decide to keep it."],
      cta: "Open your dashboard",
      url: c.billingUrl.replace(/\/billing$/, ""),
    },
    trial_ending: {
      subject: `${days} left on your free trial for ${name}`,
      lines: [`${name}: your free trial ends in ${days}.`, "Add a card now to keep your site live. Any trial days left are added to your first month."],
      cta: "Keep my site live",
      url: c.billingUrl,
    },
    paused: {
      subject: `${name} is paused`,
      lines: [`${name} is paused, so visitors see a 'temporarily unavailable' page.`, "Everything you built is saved. Pick a plan to bring it back instantly."],
      cta: "Reactivate my site",
      url: c.billingUrl,
    },
    archive_warning: {
      subject: `${name} will be archived in 9 days`,
      lines: [`${name} has been paused for three weeks.`, "In 9 days it will be archived. Reactivate before then to keep everything as it is."],
      cta: "Reactivate my site",
      url: c.billingUrl,
    },
    payment_failed: {
      subject: `We couldn't charge your card for ${name}`,
      lines: [`${name}: your latest payment didn't go through.`, "Your site stays live for 3 more days. Update your card to avoid a pause."],
      cta: "Update my card",
      url: c.billingUrl,
    },
  };
  const m = copy[kind];
  const text = `${m.lines.join("\n\n")}\n\n${m.cta}: ${m.url}\n\n— Sulva Sites\n`;
  const html =
    m.lines.map((l) => `<p>${esc(l)}</p>`).join("") +
    `<p><a href="${esc(m.url)}" style="display:inline-block;background:#0a4fe0;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${esc(m.cta)}</a></p>` +
    `<p style="color:#667">— Sulva Sites</p>`;
  return { subject: m.subject, text, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Implement `src/lib/billing/subscriptions.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Interval } from "@/lib/marketing/pricing";
import type { SubSnapshot, SubStatus } from "@/lib/billing/subscriptionState";

export type SubscriptionRow = SubSnapshot & {
  site_id: string;
  owner_id: string | null;
  interval: Interval;
  plan_id: string | null;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  flagged: string | null;
  emails_sent: string[];
  created_at: string;
};

export const SUB_COLUMNS =
  "site_id, owner_id, tier, interval, plan_id, status, trial_ends_at, current_period_end, grace_ends_at, paused_at, blocked, flagged, emails_sent, paystack_customer_code, paystack_subscription_code, created_at";

/** Service-role read. Null when the site has no row (legacy/manual) or migration 019 has not run. */
export async function loadSubscription(db: SupabaseClient, siteId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await db.from("site_subscriptions").select(SUB_COLUMNS).eq("site_id", siteId).maybeSingle();
  if (error) {
    if (error.code !== "42P01") console.error("[billing] loadSubscription failed", error.message);
    return null;
  }
  return (data as SubscriptionRow | null) ?? null;
}

export type OwnedSite = { siteId: string; slug: string; status: SubStatus; businessName: string | null; createdAt: string };

/** Sites this user owns, with billing status ("manual" when there is no subscription row). */
export async function listOwnedSites(db: SupabaseClient, userId: string): Promise<OwnedSite[]> {
  const { data: members, error } = await db.from("site_members").select("site_id").eq("user_id", userId).eq("role", "owner");
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.site_id as string);
  if (ids.length === 0) return [];
  const [subs, sites, profiles] = await Promise.all([
    db.from("site_subscriptions").select("site_id, status, created_at").in("site_id", ids),
    db.from("sites").select("id, slug, created_at").in("id", ids),
    db.from("business_profiles").select("site_id, business_name").in("site_id", ids),
  ]);
  if (sites.error) throw sites.error;
  const subBy = new Map((subs.data ?? []).map((s) => [s.site_id as string, s]));
  const nameBy = new Map((profiles.data ?? []).map((p) => [p.site_id as string, (p.business_name as string) ?? null]));
  return (sites.data ?? []).map((s) => {
    const sub = subBy.get(s.id as string);
    return {
      siteId: s.id as string,
      slug: s.slug as string,
      status: ((sub?.status as SubStatus | undefined) ?? "manual"),
      businessName: nameBy.get(s.id as string) ?? null,
      createdAt: (sub?.created_at as string | undefined) ?? (s.created_at as string),
    };
  });
}
```

- [ ] **Step 6: Implement `src/lib/billing/email.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLifecycleEmail, emailKind } from "@/lib/billing/lifecycle";
import { daysLeft } from "@/lib/billing/subscriptionState";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { isNotifiable, sendResend } from "@/lib/inbox/notify";

function platformDomain(): string {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").trim().toLowerCase();
}

/** Origin of the platform app (dashboard, billing pages). */
export function platformOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || `https://${platformDomain()}`).replace(/\/+$/, "");
}

function resend() {
  return { apiKey: process.env.RESEND_API_KEY?.trim() || null, from: process.env.RESEND_FROM?.trim() || null };
}

/** Sends one lifecycle email to the site's owner and records the key in emails_sent. Never throws. */
export async function sendLifecycleEmail(db: SupabaseClient, siteId: string, key: string): Promise<boolean> {
  try {
    const kind = emailKind(key);
    if (!kind) return false;
    const { data: owner } = await db.from("site_members").select("user_id").eq("site_id", siteId).eq("role", "owner").limit(1).maybeSingle();
    if (!owner) return false;
    const { data: u } = await db.auth.admin.getUserById(owner.user_id as string);
    const to = u.user?.email ?? null;
    const cfg = { ...resend(), to };
    if (!isNotifiable(cfg)) return false;

    const [{ data: site }, { data: profile }, sub] = await Promise.all([
      db.from("sites").select("slug").eq("id", siteId).maybeSingle(),
      db.from("business_profiles").select("business_name").eq("site_id", siteId).maybeSingle(),
      loadSubscription(db, siteId),
    ]);
    const mail = buildLifecycleEmail(kind, {
      businessName: (profile?.business_name as string | undefined) || (site?.slug as string | undefined) || "your site",
      siteUrl: `https://${site?.slug}.${platformDomain()}`,
      billingUrl: `${platformOrigin()}/dashboard/${siteId}/billing`,
      daysLeft: daysLeft(sub?.trial_ends_at ?? null, Date.now()),
    });
    const ok = await sendResend({ apiKey: cfg.apiKey!, from: cfg.from!, to: to! }, mail);
    if (ok && sub) {
      await db.from("site_subscriptions").update({ emails_sent: [...sub.emails_sent, key] }).eq("site_id", siteId);
    }
    return ok;
  } catch (err) {
    console.error("[billing] lifecycle email failed", { siteId, key, error: err instanceof Error ? err.message : "error" });
    return false;
  }
}

/** Plain notification to Sulvatech (leads, domain requests). Never throws. */
export async function sendSalesEmail(subject: string, text: string): Promise<boolean> {
  const cfg = { ...resend(), to: process.env.SALES_NOTIFY_EMAIL?.trim() || null };
  if (!isNotifiable(cfg)) return false;
  const html = `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;
  return sendResend({ apiKey: cfg.apiKey!, from: cfg.from!, to: cfg.to! }, { subject: subject.slice(0, 200), text, html });
}
```

- [ ] **Step 7: Typecheck, test and commit**

Run: `npm run typecheck` and `npm test` — Expected: no new type errors; PASS.

```bash
git add src/lib/billing/lifecycle.ts src/lib/billing/email.server.ts src/lib/billing/subscriptions.server.ts tests/billingLifecycle.test.mjs
git commit -m "Billing: lifecycle emails and subscription loaders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Paused sites, trial badge, shop and inbox gates

**Files:**
- Create: `src/lib/billing/siteState.server.ts`, `src/components/site/SitePaused.tsx`, `src/components/site/SulvaBadge.tsx`, `src/app/[slug]/layout.tsx`, `src/app/d/[hostname]/layout.tsx`
- Modify: `src/lib/shop/loadPublicShop.server.ts`, `src/app/api/shop/[siteId]/checkout/route.ts`, `src/app/api/shop/[siteId]/whatsapp-order/route.ts`, `src/app/api/sites/[siteId]/inbox/route.ts`

**Interfaces:**
- Consumes: `loadSubscription` (Task 6); `shopGateMessage`, `siteGateMessage`, `planCheckoutMode` (Task 2); `loadPublicSite` (`src/lib/publicSite.server.ts`, React-`cache`d per request).
- Produces: `SiteBillingState = { live: boolean; badge: boolean; tier: string | null; status: string | null }`, `getSiteBillingState(siteId)` (cached, fails open).

- [ ] **Step 1: Implement `src/lib/billing/siteState.server.ts`**

```ts
import { cache } from "react";

import { supabaseServer } from "@/lib/supabase/server";

export type SiteBillingState = { live: boolean; badge: boolean; tier: string | null; status: string | null };

const OPEN: SiteBillingState = { live: true, badge: false, tier: null, status: null };

/**
 * Billing state for public rendering via the site_billing_state RPC (anon-callable).
 * Fails open: no row, missing migration or any error => live, no badge.
 */
export const getSiteBillingState = cache(async (siteId: string): Promise<SiteBillingState> => {
  try {
    const { data, error } = await supabaseServer().rpc("site_billing_state", { p_site: siteId });
    if (error) {
      if (error.code !== "PGRST202" && error.code !== "42883") console.error("[billing] site_billing_state failed", error.message);
      return OPEN;
    }
    const row = (Array.isArray(data) ? data[0] : data) as Partial<SiteBillingState> | null | undefined;
    if (!row) return OPEN;
    return { live: row.live !== false, badge: row.badge === true, tier: row.tier ?? null, status: row.status ?? null };
  } catch {
    return OPEN;
  }
});
```

- [ ] **Step 2: Implement `src/components/site/SitePaused.tsx`**

Inline styles on purpose: template CSS resets must not restyle it.

```tsx
export default function SitePaused({ name }: { name: string }) {
  return (
    <main
      style={{
        minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px",
        background: "#f4f7fc", color: "#0a0f1f", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <p style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#0a4fe0", margin: 0 }}>
          Temporarily unavailable
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "12px 0" }}>{name} is taking a short break</h1>
        <p style={{ color: "rgba(10,15,31,.7)", margin: 0 }}>Please check back soon.</p>
        <p style={{ marginTop: 28, fontSize: 13 }}>
          <a href="/login" style={{ color: "#0a4fe0" }}>Site owner? Sign in to reactivate</a>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Implement `src/components/site/SulvaBadge.tsx`**

```tsx
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com";

/** Shown on Starter and trial sites. Inline styles so template CSS can't hide or restyle it. */
export default function SulvaBadge() {
  return (
    <a
      href={`https://${PLATFORM}/?ref=badge`}
      target="_blank"
      rel="noopener"
      style={{
        position: "fixed", left: 12, bottom: 12, zIndex: 2147483000, display: "inline-flex", alignItems: "center",
        gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(10,15,31,.88)", color: "#fff",
        font: "500 12px/1.2 system-ui, -apple-system, Segoe UI, sans-serif", textDecoration: "none",
        boxShadow: "0 6px 20px -8px rgba(0,0,0,.45)",
      }}
    >
      Built with <strong style={{ fontWeight: 650 }}>Sulva Sites</strong>
    </a>
  );
}
```

- [ ] **Step 4: Create `src/app/[slug]/layout.tsx`**

```tsx
import type { ReactNode } from "react";

import SitePaused from "@/components/site/SitePaused";
import SulvaBadge from "@/components/site/SulvaBadge";
import { getSiteBillingState } from "@/lib/billing/siteState.server";
import { loadPublicSite } from "@/lib/publicSite.server";

// Billing gate for every public route under /<slug> (pages, blog, shop). Pages still 404 on their own.
export default async function SiteSlugLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadPublicSite("slug", slug);
  if (!ctx) return children;
  const state = await getSiteBillingState(ctx.siteData.site.id);
  if (!state.live) return <SitePaused name={ctx.siteData.profile.business_name} />;
  return (
    <>
      {children}
      {state.badge ? <SulvaBadge /> : null}
    </>
  );
}
```

- [ ] **Step 5: Create `src/app/d/[hostname]/layout.tsx`**

Same as Step 4 with `params: Promise<{ hostname: string }>`, `const { hostname } = await params;` and `loadPublicSite("hostname", hostname)` (the hostname page passes the param unchanged, see `src/app/d/[hostname]/page.tsx:11`). Name the component `SiteHostLayout`.

- [ ] **Step 6: Storefront follows the plan**

In `src/lib/shop/loadPublicShop.server.ts` add `import { getSiteBillingState } from "@/lib/billing/siteState.server";` and `import { planCheckoutMode } from "@/lib/billing/gates";`, then replace the final `return mapShopRows({ ... });` inside the `try` with:

```ts
    const shop = mapShopRows({
      siteId,
      settings,
      categories: (cats.data ?? []) as Record<string, unknown>[],
      products: (prods.data ?? []) as Record<string, unknown>[],
      variants: (vars.data ?? []) as Record<string, unknown>[],
    });
    // Plan limits: no shop below Commerce; WhatsApp-only while trialing.
    const mode = planCheckoutMode(shop.settings.checkoutMode, await getSiteBillingState(siteId));
    if (mode === null) return null;
    return { ...shop, settings: { ...shop.settings, checkoutMode: mode } };
```

- [ ] **Step 7: Gate card checkout and WhatsApp orders server-side**

In `src/app/api/shop/[siteId]/checkout/route.ts`, add imports `import { shopGateMessage } from "@/lib/billing/gates";` and `import { loadSubscription } from "@/lib/billing/subscriptions.server";`. Directly after the `const db = requireServiceClient();` null-check, insert:

```ts
  const billingGate = shopGateMessage(await loadSubscription(db, siteId), "card", Date.now());
  if (billingGate) return json({ error: billingGate }, 403);
```

In `src/app/api/shop/[siteId]/whatsapp-order/route.ts` do the same right after its service-client null-check, with `"whatsapp"` as the kind and the route's own JSON error helper (open the file and use whatever helper it already uses for 4xx responses).

- [ ] **Step 8: Gate the inbox**

In `src/app/api/sites/[siteId]/inbox/route.ts` import `siteGateMessage` and `loadSubscription` and insert after the `if (!site || site.status !== "published") return json({ error: "Not found." }, 404);` line:

```ts
    const billingGate = siteGateMessage(await loadSubscription(db, siteId), Date.now());
    if (billingGate) return json({ error: billingGate }, 403);
```

- [ ] **Step 9: Verify**

Run: `npm run typecheck` and `npm test` — Expected: no new errors; PASS.
Start the dev server (`preview_start` with the project's launch config, or create `.claude/launch.json` with `npm run dev` on port 3000) and open `/dev/templates/t1` and an existing published site path (`/<slug>`): both render exactly as before (no badge — existing sites are `manual`, or the RPC is missing and fails open). Check `read_console_messages` for errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/billing/siteState.server.ts src/components/site/SitePaused.tsx src/components/site/SulvaBadge.tsx "src/app/[slug]/layout.tsx" "src/app/d/[hostname]/layout.tsx" src/lib/shop/loadPublicShop.server.ts "src/app/api/shop/[siteId]/checkout/route.ts" "src/app/api/shop/[siteId]/whatsapp-order/route.ts" "src/app/api/sites/[siteId]/inbox/route.ts"
git commit -m "Billing: paused-site page, trial badge, shop and inbox gates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ask AI allowance and staff seats follow the plan

**Files:**
- Modify: `src/app/api/sites/[siteId]/assistant/route.ts`, `src/lib/siteMembers.server.ts`

**Interfaces:**
- Consumes: `effectiveAiLimit` (Task 1), `staffGateMessage` (Task 2), `loadSubscription` (Task 6), `supabaseService`.

- [ ] **Step 1: AI limit**

In `src/app/api/sites/[siteId]/assistant/route.ts` import `effectiveAiLimit` from `@/lib/billing/planFeatures` and `loadSubscription` from `@/lib/billing/subscriptions.server`. Replace **both** occurrences of

```ts
  const limit = monthlyLimitFor(auth.role, process.env);
```

with

```ts
  const limit = effectiveAiLimit(auth.role, await loadSubscription(supabaseService(), siteId), monthlyLimitFor(auth.role, process.env));
```

(`siteId` is already in scope in both handlers; `supabaseService` is already imported — confirm with `rg -n "supabaseService" "src/app/api/sites/[siteId]/assistant/route.ts"`.) In the 429 message replace `or ask Sulvatech about a bigger plan` with `or upgrade your plan in Billing`.

- [ ] **Step 2: Staff seats**

In `src/lib/siteMembers.server.ts` import `staffGateMessage` from `@/lib/billing/gates` and `loadSubscription` from `@/lib/billing/subscriptions.server`. In `addMember`, immediately after the `canInvite` check block, insert:

```ts
  if (role === "staff" && actor.role !== "admin") {
    const service = supabaseService();
    const { count, error: countErr } = await service
      .from("site_members")
      .select("user_id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("role", "staff");
    if (countErr) return json({ error: "Could not check your plan." }, 500);
    const gate = staffGateMessage(await loadSubscription(service, siteId), count ?? 0);
    if (gate) return json({ error: gate }, 403);
  }
```

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck` and `npm test` — Expected: no new errors; PASS.

```bash
git add "src/app/api/sites/[siteId]/assistant/route.ts" src/lib/siteMembers.server.ts
git commit -m "Billing: AI allowance and staff seats follow the plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: Marketing shell, content and home page

**Files:**
- Create: `src/lib/marketing/content.ts`, `src/components/marketing/MarketingShell.tsx`, `src/components/marketing/TemplateThumb.tsx`, `src/components/marketing/Faq.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
- Modify (rewrite): `src/app/page.tsx`; `src/app/layout.tsx` (metadata only)
- Test: `tests/marketingContent.test.mjs`

**Interfaces:**
- Consumes: `isPromoActive`, `promoEndLabel`, `offeredPlans`, `formatNaira`, `PLAN_INFO`, `TIERS`, `TRIAL_DAYS` (Task 1); `TEMPLATE_META` (`src/templates/meta.ts`).
- Produces: `FEATURES`, `HOW_IT_WORKS`, `HOME_FAQ`, `PRICING_FAQ`, `TEMPLATE_GROUPS`, `SHOWCASE_KEYS` (content.ts); `MarketingShell({ children })`; `TemplateThumb({ templateKey, name, category })`; `Faq({ items })`.

- [ ] **Step 1: Write the failing test**

`tests/marketingContent.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { HOME_FAQ, PRICING_FAQ, SHOWCASE_KEYS, TEMPLATE_GROUPS } from "../src/lib/marketing/content.ts";
import { TEMPLATE_META } from "../src/templates/meta.ts";

test("every template is in exactly one gallery group", () => {
  const all = TEMPLATE_GROUPS.flatMap((g) => g.keys);
  assert.deepEqual([...all].sort(), TEMPLATE_META.map((t) => t.key).sort());
  assert.equal(new Set(all).size, all.length);
});

test("showcase keys are real templates", () => {
  const keys = new Set(TEMPLATE_META.map((t) => t.key));
  assert.equal(SHOWCASE_KEYS.length, 6);
  for (const k of SHOWCASE_KEYS) assert.ok(keys.has(k), k);
});

test("FAQ copy mentions the real numbers", () => {
  const text = [...HOME_FAQ, ...PRICING_FAQ].map((f) => f.q + f.a).join(" ");
  assert.match(text, /7 days/);
  assert.match(text, /8 Apr 2027/);
  assert.match(text, /₦25,000/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (content.ts missing).

- [ ] **Step 3: Implement `src/lib/marketing/content.ts`**

```ts
// Marketing copy. Pure: relative imports only.
import { DOMAIN_ADDONS, TRIAL_DAYS, formatNaira, promoEndLabel } from "./pricing.ts";

export type Feature = { title: string; body: string };
export type Faq = { q: string; a: string };

export const SHOWCASE_KEYS = ["t5", "t7", "t13", "t1", "t15", "t16"] as const;

export const TEMPLATE_GROUPS: Array<{ id: string; label: string; keys: string[] }> = [
  { id: "services", label: "Services", keys: ["t1", "t5", "t8", "t9", "t12"] },
  { id: "food-shops", label: "Food & shops", keys: ["t7", "t13", "t14"] },
  { id: "creative", label: "Creative & writing", keys: ["t2", "t3", "t17"] },
  { id: "product", label: "Product & startup", keys: ["t4"] },
  { id: "property-auto", label: "Property & auto", keys: ["t6", "t15"] },
  { id: "community", label: "Community, events & learning", keys: ["t10", "t11", "t16"] },
];

export const FEATURES: Feature[] = [
  { title: "Your own dashboard", body: "Edit pages, photos and prices from your phone. No developer needed." },
  { title: "Enquiries in one inbox", body: "Contact and booking forms land in your inbox with an email alert." },
  { title: "Sell online", body: "Products, cart and checkout with Paystack cards or WhatsApp orders." },
  { title: "A blog on every site", body: "Share news and tips that help customers find you on Google." },
  { title: "Ask AI", body: "Describe a change in plain words and watch your site update." },
  { title: "Light and dark looks", body: "Seventeen designs made for Nigerian businesses, each with its own style." },
];

export const HOW_IT_WORKS: { diy: string[]; dfy: string[] } = {
  diy: [
    "Tell us your business name and what you do.",
    "Pick a design. We write your pages and put the site live.",
    `Make it yours for ${TRIAL_DAYS} days free, then pick a plan.`,
  ],
  dfy: [
    "Send us a short brief or chat on WhatsApp.",
    "We design, write and set up everything for you.",
    "You approve it, we launch, and you run it from your dashboard.",
  ],
};

const com = DOMAIN_ADDONS.find((d) => d.tld === ".com")!;
const ng = DOMAIN_ADDONS.find((d) => d.tld === ".com.ng")!;

export const HOME_FAQ: Faq[] = [
  { q: "Do I need a card for the free trial?", a: `No. You get ${TRIAL_DAYS} days free with no card. Add one only when you decide to keep your site.` },
  { q: "Can I use my own domain?", a: `Yes, on Business and Commerce. Don't have one? We can buy and manage it for you: ${formatNaira(com.yearly)}/yr for .com, ${formatNaira(ng.yearly)}/yr for .com.ng.` },
  { q: "Can you build it for me?", a: "Yes. Choose “Have us build it”, send a short brief, and our team sets everything up." },
  { q: "What happens to launch pricing?", a: `Sign up before ${promoEndLabel()} and you keep the launch price for as long as you stay subscribed.` },
];

export const PRICING_FAQ: Faq[] = [
  { q: "What happens when my trial ends?", a: `After ${TRIAL_DAYS} days your site pauses until you pick a plan. Nothing is deleted, and paying brings it back instantly.` },
  { q: "If I pay early, do I lose trial days?", a: "No. Unused trial days are added before your first paid month starts." },
  { q: "Can I cancel?", a: "Yes, any time from your dashboard. Your site stays live until the end of the period you paid for." },
  { q: "Is the launch price really for life?", a: `Yes. Subscribe before ${promoEndLabel()} and your price doesn't go up while your subscription stays active.` },
  { q: "Why is there a setup fee for done-for-you?", a: "It covers our team writing your content, preparing photos and setting everything up. Doing it yourself has no setup fee." },
  { q: "How does the domain add-on work?", a: `We buy the domain in your business name, connect it and renew it every year: ${formatNaira(com.yearly)}/yr for .com, ${formatNaira(ng.yearly)}/yr for .com.ng.` },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Implement `src/components/marketing/MarketingShell.tsx`**

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

import { isPromoActive, promoEndLabel } from "@/lib/marketing/pricing";

const NAV = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/start", label: "Have us build it" },
];

export function Wordmark() {
  return (
    <span className="text-lg font-semibold tracking-tight">
      Sulva <span className="font-serif text-xl italic text-koi-deep">Sites</span>
    </span>
  );
}

export default function MarketingShell({ children }: { children: ReactNode }) {
  const promo = isPromoActive();
  return (
    <div className="min-h-screen bg-koi-paper font-sans text-koi-ink">
      {promo ? (
        <div className="bg-koi-ink px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
          Launch pricing: every plan at a third of the price, kept for life. Ends {promoEndLabel()}.{" "}
          <Link href="/pricing" className="underline underline-offset-2">See prices</Link>
        </div>
      ) : null}
      <header
        className="sticky top-0 z-40 border-b border-koi-ink/5 bg-koi-paper/80"
        style={{ backdropFilter: "blur(14px)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" aria-label="Sulva Sites home"><Wordmark /></Link>
          <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm text-koi-ink/80 sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-koi-deep">{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-koi-ink/80 hover:text-koi-deep">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-koi-deep px-4 py-2 text-sm font-medium text-white hover:bg-koi-ink">
              Start free trial
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-koi-ink/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-koi-ink/70">Websites for Nigerian businesses, by Sulvatech.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/templates">Templates</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/start">Have us build it</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/signup">Start free trial</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-koi-ink/50">© {new Date().getFullYear()} Sulvatech</p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 6: Implement `src/components/marketing/TemplateThumb.tsx` and `Faq.tsx`**

`TemplateThumb.tsx` (live, scaled-down iframe of the public demo; `?thumb=1` hides the demo bar):

```tsx
import Link from "next/link";

export default function TemplateThumb({ templateKey, name, category }: { templateKey: string; name: string; category: string }) {
  return (
    <Link href={`/templates/${templateKey}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-koi-ink/10 transition group-hover:ring-koi-deep/40">
        <iframe
          src={`/templates/${templateKey}?thumb=1`}
          title={`${name} template preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-25 border-0"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span className="text-xs text-koi-ink/60">{category}</span>
      </div>
    </Link>
  );
}
```

`Faq.tsx`:

```tsx
import type { Faq as FaqItem } from "@/lib/marketing/content";

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-koi-ink/10 rounded-3xl bg-white ring-1 ring-koi-ink/5">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.q}
            <span className="text-koi-deep transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm text-koi-ink/70">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Rewrite `src/app/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import Faq from "@/components/marketing/Faq";
import MarketingShell from "@/components/marketing/MarketingShell";
import TemplateThumb from "@/components/marketing/TemplateThumb";
import { WaterBackdrop } from "@/components/ui/WaterBackdrop";
import { FEATURES, HOME_FAQ, HOW_IT_WORKS, SHOWCASE_KEYS } from "@/lib/marketing/content";
import { PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, offeredPlans } from "@/lib/marketing/pricing";
import { TEMPLATE_META } from "@/templates/meta";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sulva Sites — your business website, live today",
  description: `Beautiful websites for Nigerian businesses with a dashboard, inbox, online shop and blog. ${TRIAL_DAYS} days free.`,
};

export default function HomePage() {
  const plans = offeredPlans().filter((p) => p.interval === "monthly");
  const showcase = SHOWCASE_KEYS.map((k) => TEMPLATE_META.find((t) => t.key === k)!);
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <WaterBackdrop className="absolute inset-0 -z-10 opacity-90" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-white sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your business website, <span className="font-serif font-normal italic">live today.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Pick a design, tell us about your business, and get a site with a dashboard, inbox, online shop and blog.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-white px-6 py-3 font-medium text-koi-deep hover:bg-koi-paper">
              Start {TRIAL_DAYS}-day free trial
            </Link>
            <Link href="/start" className="rounded-full px-6 py-3 font-medium text-white ring-1 ring-white/60 hover:bg-white/10">
              Have us build it
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">No card needed. Cancel any time.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Seventeen designs, <span className="font-serif font-normal italic">one for you</span></h2>
          <Link href="/templates" className="shrink-0 text-sm text-koi-deep">See all →</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {showcase.map((t) => <TemplateThumb key={t.key} templateKey={t.key} name={t.name} category={t.category} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <h2 className="text-2xl font-semibold sm:text-3xl">Everything included</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5">
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-koi-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-24 md:grid-cols-2">
        {([
          ["Do it yourself", HOW_IT_WORKS.diy, "/signup", `Start free for ${TRIAL_DAYS} days`],
          ["Done for you", HOW_IT_WORKS.dfy, "/start", "Send us your brief"],
        ] as const).map(([title, steps, href, cta]) => (
          <div key={title} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
            <h3 className="text-xl font-semibold">{title}</h3>
            <ol className="mt-5 space-y-3">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-koi-deep text-xs text-white">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href={href} className="mt-6 inline-block text-sm font-medium text-koi-deep">{cta} →</Link>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <h2 className="text-2xl font-semibold sm:text-3xl">Simple monthly pricing</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const p = plans.find((x) => x.tier === tier)!;
            return (
              <div key={tier} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5">
                <p className="font-medium">{PLAN_INFO[tier].name}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatNaira(p.price)}<span className="text-base font-normal text-koi-ink/60">/mo</span>
                </p>
                {p.launch ? <p className="text-sm text-koi-ink/50 line-through">{formatNaira(p.standardPrice)}/mo</p> : null}
                <p className="mt-3 text-sm text-koi-ink/70">{PLAN_INFO[tier].blurb}</p>
              </div>
            );
          })}
        </div>
        <Link href="/pricing" className="mt-6 inline-block text-sm font-medium text-koi-deep">Compare plans →</Link>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-24">
        <h2 className="mb-6 text-2xl font-semibold sm:text-3xl">Questions</h2>
        <Faq items={HOME_FAQ} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <div className="rounded-[2rem] bg-koi-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-semibold">Ready when you are.</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-white px-6 py-3 font-medium text-koi-ink">Start free trial</Link>
            <Link href="/start" className="rounded-full px-6 py-3 font-medium ring-1 ring-white/50">Have us build it</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
```

Check `WaterBackdrop`'s props (`src/components/ui/WaterBackdrop.tsx:2` takes `className` and `koi`) and adjust the hero if it renders its own positioning.

- [ ] **Step 8: Platform metadata, sitemap and robots**

In `src/app/layout.tsx` change the metadata description from `"Sulvatech internal website builder"` to `"Websites for Nigerian businesses, by Sulvatech."` and add `metadataBase: new URL(\`https://${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com"}\`)`.

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { normalizeHost } from "@/lib/hostRouting";
import { TEMPLATE_META } from "@/templates/meta";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").toLowerCase();

// Platform domain only. Client sites get their own sitemap in the launch-readiness work.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  if (normalizeHost(h.get("x-forwarded-host") || h.get("host") || "") !== PLATFORM) return [];
  const base = `https://${PLATFORM}`;
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/pricing`, priority: 0.9 },
    { url: `${base}/templates`, priority: 0.9 },
    { url: `${base}/start`, priority: 0.6 },
    { url: `${base}/signup`, priority: 0.6 },
    ...TEMPLATE_META.map((t) => ({ url: `${base}/templates/${t.key}`, priority: 0.7 })),
  ];
}
```

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").toLowerCase();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/dev"] }],
    sitemap: `https://${PLATFORM}/sitemap.xml`,
  };
}
```

- [ ] **Step 9: Verify in the browser**

Start the dev server (`preview_start`). Open `/`: hero, launch banner with "8 Apr 2027", 6 live thumbnails (they load once Task 10 exists — until then they 404 inside the frame, which is fine), features, pricing teaser showing ₦3,500 / ₦7,000 / ₦12,000 with struck ₦10,000 / ₦20,000 / ₦35,000, FAQ. `resize_window` preset mobile: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth` via `javascript_tool`). Check console for errors. Screenshot for the user.

- [ ] **Step 10: Commit**

```bash
git add src/lib/marketing/content.ts src/components/marketing/MarketingShell.tsx src/components/marketing/TemplateThumb.tsx src/components/marketing/Faq.tsx src/app/page.tsx src/app/layout.tsx src/app/sitemap.ts src/app/robots.ts tests/marketingContent.test.mjs
git commit -m "Public home page, marketing shell, sitemap and robots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Templates gallery and public demos

**Files:**
- Create: `src/app/templates/page.tsx`, `src/app/templates/[key]/[[...page]]/page.tsx`, `src/components/marketing/TemplateGallery.tsx`, `src/components/marketing/DemoBar.tsx`

**Interfaces:**
- Consumes: `renderSampleTemplate(key, page, baseUrl, opts)` (`src/templates/samplePreview.tsx`), `TEMPLATE_META`, `TEMPLATE_GROUPS`, `TemplateThumb`, `MarketingShell`.

- [ ] **Step 1: `src/components/marketing/TemplateGallery.tsx`**

```tsx
"use client";

import { useState } from "react";

import TemplateThumb from "@/components/marketing/TemplateThumb";
import { TEMPLATE_GROUPS } from "@/lib/marketing/content";
import { TEMPLATE_META } from "@/templates/meta";

export default function TemplateGallery() {
  const [group, setGroup] = useState<string>("all");
  const keys = group === "all" ? null : new Set(TEMPLATE_GROUPS.find((g) => g.id === group)?.keys ?? []);
  const list = TEMPLATE_META.filter((t) => !keys || keys.has(t.key));
  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setGroup(id)}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1 ${
        group === id ? "bg-koi-ink text-white ring-koi-ink" : "bg-white text-koi-ink ring-koi-ink/10 hover:ring-koi-deep/40"
      }`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {chip("all", "All")}
        {TEMPLATE_GROUPS.map((g) => chip(g.id, g.label))}
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <div key={t.key}>
            <TemplateThumb templateKey={t.key} name={t.name} category={t.category} />
            <p className="mt-1 text-sm text-koi-ink/60">{t.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: `src/app/templates/page.tsx`**

```tsx
import type { Metadata } from "next";

import MarketingShell from "@/components/marketing/MarketingShell";
import TemplateGallery from "@/components/marketing/TemplateGallery";

export const metadata: Metadata = {
  title: "Templates — Sulva Sites",
  description: "Seventeen website designs for restaurants, shops, clinics, salons, schools, churches and more.",
};

export default function TemplatesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your <span className="font-serif font-normal italic text-koi-deep">look</span>
        </h1>
        <p className="mt-3 max-w-xl text-koi-ink/70">Open any design to click around a full demo site. Your words, photos and colours replace the samples.</p>
        <div className="mt-10"><TemplateGallery /></div>
      </section>
    </MarketingShell>
  );
}
```

- [ ] **Step 3: `src/components/marketing/DemoBar.tsx`**

```tsx
import Link from "next/link";

export default function DemoBar({ templateKey, name }: { templateKey: string; name: string }) {
  return (
    <div className="fixed inset-x-0 bottom-3 z-[2147483000] flex justify-center px-3 font-sans">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-koi-ink/90 p-1.5 pl-4 text-sm text-white shadow-2xl" style={{ backdropFilter: "blur(10px)" }}>
        <Link href="/templates" className="whitespace-nowrap text-white/70 hover:text-white">← All</Link>
        <span className="whitespace-nowrap font-medium">{name}</span>
        <Link href={`/start?template=${templateKey}`} className="whitespace-nowrap rounded-full px-3 py-2 ring-1 ring-white/30 hover:bg-white/10">
          Have us build it
        </Link>
        <Link href={`/signup?template=${templateKey}`} className="whitespace-nowrap rounded-full bg-white px-4 py-2 font-medium text-koi-ink">
          Use this template
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/templates/[key]/[[...page]]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DemoBar from "@/components/marketing/DemoBar";
import { TEMPLATE_META } from "@/templates/meta";
import { renderSampleTemplate } from "@/templates/samplePreview";

type Params = Promise<{ key: string; page?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  const meta = TEMPLATE_META.find((t) => t.key === key);
  return meta ? { title: `${meta.name} — ${meta.category} website template | Sulva Sites`, description: meta.description } : {};
}

/** Public demo of a template with sample content. `?thumb=1` (gallery thumbnails) hides the demo bar. */
export default async function TemplateDemoPage({ params, searchParams }: { params: Params; searchParams: Promise<{ thumb?: string }> }) {
  const { key, page } = await params;
  const { thumb } = await searchParams;
  const meta = TEMPLATE_META.find((t) => t.key === key);
  if (!meta) notFound();
  const view = renderSampleTemplate(key, page, `/templates/${key}`);
  if (!view) notFound();
  return (
    <>
      {view}
      {thumb ? null : <DemoBar templateKey={key} name={meta.name} />}
    </>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Open `/templates`: 17 cards, chips filter (click "Food & shops" → 3 cards). Open `/templates/t7`: full demo + bar; click a nav link inside the demo → stays under `/templates/t7/...`; `/templates/t13/shop` renders the storefront. `/templates/t99` → 404. `/` thumbnails now render. Mobile preset: demo bar fits (scrolls horizontally inside itself, page does not). No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/templates src/components/marketing/TemplateGallery.tsx src/components/marketing/DemoBar.tsx
git commit -m "Public template gallery and live demos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Pricing page

**Files:**
- Create: `src/app/pricing/page.tsx`, `src/components/marketing/PricingTable.tsx`

**Interfaces:**
- Consumes: `offeredPlans`, `setupFee`, `PLAN_INFO`, `TIERS`, `TRIAL_DAYS`, `DOMAIN_ADDONS`, `formatNaira`, `isPromoActive`, `promoEndLabel` (Task 1); `COMPARE_ROWS`, `planFeatures` (Task 1); `PRICING_FAQ`, `Faq`, `MarketingShell` (Task 9).

- [ ] **Step 1: `src/components/marketing/PricingTable.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { COMPARE_ROWS, planFeatures } from "@/lib/billing/planFeatures";
import {
  DOMAIN_ADDONS, PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, setupFee,
  type Interval, type OfferedPlan,
} from "@/lib/marketing/pricing";

type Path = "diy" | "dfy";

export default function PricingTable({ plans, launch, endLabel }: { plans: OfferedPlan[]; launch: boolean; endLabel: string }) {
  const [path, setPath] = useState<Path>("diy");
  const [period, setPeriod] = useState<Interval>("monthly");
  const per = period === "monthly" ? "/mo" : "/yr";

  const toggle = <T extends string>(value: T, set: (v: T) => void, options: Array<[T, string]>) => (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-koi-ink/10">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          className={`rounded-full px-4 py-2 text-sm ${value === v ? "bg-koi-ink text-white" : "text-koi-ink/70"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {toggle(path, setPath, [["diy", "Do it yourself"], ["dfy", "Done for you"]])}
        {toggle(period, setPeriod, [["monthly", "Monthly"], ["annually", "Yearly · 2 months free"]])}
      </div>
      <p className="mt-4 text-center text-sm text-koi-ink/70">
        {path === "diy"
          ? `${TRIAL_DAYS} days free, no card. No setup fee.`
          : "We design, write and launch it for you. One-time setup fee, then the same plan price."}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const p = plans.find((x) => x.tier === tier && x.interval === period)!;
          const featured = tier === "business";
          const cta = path === "diy"
            ? { href: `/signup?plan=${tier}&interval=${period}`, label: `Start ${TRIAL_DAYS}-day free trial` }
            : { href: `/start?plan=${tier}`, label: "Have us build it" };
          return (
            <div
              key={tier}
              className={`relative flex flex-col rounded-3xl bg-white p-6 ring-1 ${featured ? "ring-2 ring-koi-deep" : "ring-koi-ink/5"}`}
            >
              {featured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-koi-deep px-3 py-1 text-xs font-medium text-white">Most popular</span>
              ) : null}
              <p className="text-lg font-semibold">{PLAN_INFO[tier].name}</p>
              <p className="mt-1 text-sm text-koi-ink/70">{PLAN_INFO[tier].blurb}</p>
              <p className="mt-5 text-4xl font-semibold">
                {formatNaira(p.price)}<span className="text-base font-normal text-koi-ink/60">{per}</span>
              </p>
              {launch ? <p className="text-sm text-koi-ink/50"><s>{formatNaira(p.standardPrice)}{per}</s> · launch price for life</p> : null}
              {path === "dfy" ? (
                <p className="mt-2 text-sm">
                  + {formatNaira(setupFee(tier, launch))} one-time setup
                  {launch ? <span className="text-koi-ink/50"> (<s>{formatNaira(setupFee(tier, false))}</s>)</span> : null}
                </p>
              ) : null}
              <Link
                href={cta.href}
                className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-medium ${featured ? "bg-koi-deep text-white" : "bg-koi-paper text-koi-ink ring-1 ring-koi-ink/10"}`}
              >
                {cta.label}
              </Link>
            </div>
          );
        })}
      </div>
      {launch ? <p className="mt-4 text-center text-sm text-koi-ink/60">Launch pricing ends {endLabel}. Subscribe before then and keep your price.</p> : null}

      <div className="mt-16 overflow-x-auto rounded-3xl bg-white ring-1 ring-koi-ink/5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-koi-ink/10 text-left">
              <th className="p-4 font-medium">Compare plans</th>
              {TIERS.map((t) => <th key={t} className="p-4 text-center font-medium">{PLAN_INFO[t].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-koi-ink/5 last:border-0">
                <td className="p-4 text-koi-ink/80">{row.label}</td>
                {TIERS.map((t) => {
                  const v = row.value(planFeatures(t));
                  return (
                    <td key={t} className="p-4 text-center">
                      {v === true ? <span className="text-koi-deep">✓</span> : v === false ? <span className="text-koi-ink/30">—</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
        <p className="text-lg font-semibold">Add-on: we buy and manage your domain</p>
        <p className="mt-1 text-sm text-koi-ink/70">We register it in your business name, connect it, handle SSL and renew it every year.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {DOMAIN_ADDONS.map((d) => (
            <span key={d.tld} className="rounded-full bg-koi-paper px-4 py-2 text-sm ring-1 ring-koi-ink/10">
              {d.tld} · {formatNaira(d.yearly)}/yr
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-koi-ink/60">Already own a domain? Connecting it is free on Business and Commerce.</p>
      </div>
    </>
  );
}
```

- [ ] **Step 2: `src/app/pricing/page.tsx`**

```tsx
import type { Metadata } from "next";

import Faq from "@/components/marketing/Faq";
import MarketingShell from "@/components/marketing/MarketingShell";
import PricingTable from "@/components/marketing/PricingTable";
import { PRICING_FAQ } from "@/lib/marketing/content";
import { isPromoActive, offeredPlans, promoEndLabel } from "@/lib/marketing/pricing";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing — Sulva Sites",
  description: "Simple monthly plans for your business website. 7 days free, or let us build it for you.",
};

export default function PricingPage() {
  const now = new Date();
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          Pricing that <span className="font-serif font-normal italic text-koi-deep">grows with you</span>
        </h1>
        <div className="mt-10">
          <PricingTable plans={offeredPlans(now)} launch={isPromoActive(now)} endLabel={promoEndLabel()} />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pt-20">
        <h2 className="mb-6 text-2xl font-semibold">Pricing questions</h2>
        <Faq items={PRICING_FAQ} />
      </section>
    </MarketingShell>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Open `/pricing`. Monthly + DIY: ₦3,500 / ₦7,000 / ₦12,000 with struck ₦10,000 / ₦20,000 / ₦35,000. Yearly: ₦35,000 / ₦70,000 / ₦120,000. Done for you: "+ ₦50,000 one-time setup (₦150,000)" etc. CTA links carry `?plan=…&interval=…`. Compare table scrolls inside its box on mobile. Domain card shows ₦25,000 and ₦15,000. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/app/pricing/page.tsx src/components/marketing/PricingTable.tsx
git commit -m "Public pricing page with DIY / done-for-you toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Done-for-you brief (`/start`), leads API and admin leads

**Files:**
- Create: `src/lib/marketing/leadInput.ts`, `src/app/api/leads/route.ts`, `src/components/marketing/LeadForm.tsx`, `src/app/start/page.tsx`, `src/app/api/admin/leads/route.ts`, `src/app/admin/leads/page.tsx`
- Modify: `src/app/admin/layout.tsx` (nav)
- Test: `tests/leadInput.test.mjs`

**Interfaces:**
- Consumes: `isTier` (Task 1), `normalizePhoneNg` (Task 3), `sendSalesEmail` (Task 6), `requireAdmin(req, { superOnly: true })`, `supabaseService`, `shopRateLimit`, `clientIp`, `apiFetch` (`src/components/shop-admin/common.tsx`).
- Produces: `LeadInput`, `parseLeadInput(body, templateKeys)`.

- [ ] **Step 1: Write the failing test**

`tests/leadInput.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseLeadInput } from "../src/lib/marketing/leadInput.ts";

const KEYS = ["t1", "t7"];
const ok = { name: "Ada Okafor", email: "ada@example.com", phone: "0803 123 4567", business: "Ada's Kitchen", templateKey: "t7", tier: "commerce", notes: "Jollof" };

test("valid brief is normalised", () => {
  const r = parseLeadInput(ok, KEYS);
  assert.equal(r.ok, true);
  assert.equal(r.value.phone, "+2348031234567");
  assert.equal(r.value.email, "ada@example.com");
  assert.equal(r.value.templateKey, "t7");
  assert.equal(r.value.tier, "commerce");
  assert.equal(r.value.domain, null);
  assert.equal(r.value.honeypot, false);
});

test("international phone kept, junk rejected", () => {
  assert.equal(parseLeadInput({ ...ok, phone: "+44 7700 900123" }, KEYS).value.phone, "+447700900123");
  assert.equal(parseLeadInput({ ...ok, phone: "12" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, email: "nope" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, name: "A" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, business: "" }, KEYS).ok, false);
  assert.equal(parseLeadInput(null, KEYS).ok, false);
});

test("unknown template / tier dropped, domain validated, honeypot flagged", () => {
  const r = parseLeadInput({ ...ok, templateKey: "t99", tier: "gold", domain: "AdasKitchen.com.ng" }, KEYS);
  assert.equal(r.value.templateKey, null);
  assert.equal(r.value.tier, null);
  assert.equal(r.value.domain, "adaskitchen.com.ng");
  assert.equal(parseLeadInput({ ...ok, domain: "not a domain" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, website: "spam" }, KEYS).value.honeypot, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/marketing/leadInput.ts`**

```ts
// Done-for-you brief validation. Pure: relative imports only.
import { normalizePhoneNg } from "../billing/identity.ts";
import { isTier, type Tier } from "./pricing.ts";

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  business: string;
  category: string | null;
  templateKey: string | null;
  tier: Tier | null;
  domain: string | null;
  notes: string | null;
  honeypot: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function parseLeadInput(body: unknown, templateKeys: readonly string[]): { ok: true; value: LeadInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  const name = text(b.name, 80);
  const business = text(b.business, 120);
  const email = text(b.email, 254).toLowerCase();
  const rawPhone = text(b.phone, 30);
  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (business.length < 2) return { ok: false, error: "Enter your business name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const intl = rawPhone.replace(/[^\d+]/g, "");
  const phone = normalizePhoneNg(rawPhone) ?? (/^\+\d{8,15}$/.test(intl) ? intl : null);
  if (!phone) return { ok: false, error: "Enter a valid phone or WhatsApp number." };
  const domainRaw = text(b.domain, 100).toLowerCase();
  if (domainRaw && !DOMAIN_RE.test(domainRaw)) return { ok: false, error: "Enter a domain like yourbusiness.com.ng." };
  const templateKey = typeof b.templateKey === "string" && templateKeys.includes(b.templateKey) ? b.templateKey : null;
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 2000) : "";
  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      business,
      category: text(b.category, 60) || null,
      templateKey,
      tier: isTier(b.tier) ? b.tier : null,
      domain: domainRaw || null,
      notes: notes || null,
      honeypot: typeof b.website === "string" && b.website.trim() !== "",
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: `src/app/api/leads/route.ts`**

```ts
import { NextResponse } from "next/server";

import { sendSalesEmail } from "@/lib/billing/email.server";
import { parseLeadInput } from "@/lib/marketing/leadInput";
import { clientIp } from "@/lib/shop/requestIp";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { supabaseService } from "@/lib/supabase/admin.server";
import { TEMPLATE_META } from "@/templates/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const limited = shopRateLimit(`leads:${clientIp(req)}`, 5, 60 * 60_000);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseLeadInput(body, TEMPLATE_META.map((t) => t.key));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const l = parsed.value;
  if (l.honeypot) return json({ ok: true });

  const { error } = await supabaseService().from("leads").insert({
    name: l.name, email: l.email, phone: l.phone, business: l.business, category: l.category,
    template_key: l.templateKey, tier: l.tier, domain: l.domain, notes: l.notes,
  });
  if (error) {
    console.error("[leads] insert failed", error.message);
    return json({ error: "Could not send your brief. Please try WhatsApp instead." }, 500);
  }
  await sendSalesEmail(
    `New done-for-you brief: ${l.business}`,
    [
      `Name: ${l.name}`, `Business: ${l.business}`, `Email: ${l.email}`, `Phone: ${l.phone}`,
      `Plan: ${l.tier ?? "-"}`, `Template: ${l.templateKey ?? "-"}`, `Domain wanted: ${l.domain ?? "-"}`,
      "", l.notes ?? "",
    ].join("\n"),
  );
  return json({ ok: true });
}
```

- [ ] **Step 6: `src/components/marketing/LeadForm.tsx`**

```tsx
"use client";

import { useState } from "react";

import { PLAN_INFO, TIERS } from "@/lib/marketing/pricing";
import { TEMPLATE_META } from "@/templates/meta";

const input = "w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-koi-ink/10 focus:outline-none focus:ring-2 focus:ring-koi-deep";
const WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP?.replace(/\D/g, "") || "";

export default function LeadForm({ template, plan }: { template?: string; plan?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  const wa = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Sulva Sites, I'd like you to build my website.")}` : null;

  if (state === "sent") {
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-koi-ink/5">
        <p className="text-2xl font-semibold">Thanks! We've got your brief.</p>
        <p className="mt-2 text-koi-ink/70">We'll reach out within one working day.</p>
        {wa ? <a href={wa} className="mt-6 inline-block rounded-full bg-[#25D366] px-5 py-3 font-medium text-white">Chat on WhatsApp now</a> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-white/60 p-6 ring-1 ring-koi-ink/5 sm:grid-cols-2 sm:p-8">
      <input name="name" required placeholder="Your name" className={input} autoComplete="name" />
      <input name="business" required placeholder="Business name" className={input} autoComplete="organization" />
      <input name="email" type="email" required placeholder="Email" className={input} autoComplete="email" />
      <input name="phone" required placeholder="WhatsApp number" className={input} autoComplete="tel" />
      <input name="category" placeholder="What do you do? (e.g. bakery)" className={input} />
      <select name="tier" defaultValue={plan ?? "business"} className={input}>
        {TIERS.map((t) => <option key={t} value={t}>{PLAN_INFO[t].name} plan</option>)}
      </select>
      <select name="templateKey" defaultValue={template ?? ""} className={input}>
        <option value="">Help me choose a design</option>
        {TEMPLATE_META.map((t) => <option key={t.key} value={t.key}>{t.name} — {t.category}</option>)}
      </select>
      <input name="domain" placeholder="Domain you'd like (optional)" className={input} />
      <textarea name="notes" rows={4} placeholder="Anything else? Pages you need, colours, examples you like…" className={`${input} sm:col-span-2`} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error ? <p className="text-sm text-koi-orange sm:col-span-2">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={state === "sending"} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Send my brief"}
        </button>
        {wa ? <a href={wa} className="text-sm text-koi-deep">or chat on WhatsApp</a> : null}
      </div>
    </form>
  );
}
```

- [ ] **Step 7: `src/app/start/page.tsx`**

```tsx
import type { Metadata } from "next";

import LeadForm from "@/components/marketing/LeadForm";
import MarketingShell from "@/components/marketing/MarketingShell";
import { HOW_IT_WORKS } from "@/lib/marketing/content";
import { formatNaira, isPromoActive, isTier, setupFee } from "@/lib/marketing/pricing";

export const metadata: Metadata = {
  title: "Have us build it — Sulva Sites",
  description: "Tell us about your business and our team designs, writes and launches your website.",
};

export default async function StartPage({ searchParams }: { searchParams: Promise<{ template?: string; plan?: string }> }) {
  const { template, plan } = await searchParams;
  const launch = isPromoActive();
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          We'll build it <span className="font-serif font-normal italic text-koi-deep">for you</span>
        </h1>
        <ol className="mt-6 grid gap-3 text-sm text-koi-ink/80 sm:grid-cols-3">
          {HOW_IT_WORKS.dfy.map((s, i) => <li key={s}><span className="font-medium text-koi-deep">{i + 1}.</span> {s}</li>)}
        </ol>
        <p className="mt-4 text-sm text-koi-ink/60">
          One-time setup from {formatNaira(setupFee("starter", launch))}, then your monthly plan.
        </p>
        <div className="mt-10">
          <LeadForm template={template} plan={isTier(plan) ? plan : undefined} />
        </div>
      </section>
    </MarketingShell>
  );
}
```

- [ ] **Step 8: Admin leads API `src/app/api/admin/leads/route.ts`**

```ts
import { NextResponse } from "next/server";

import { supabaseService } from "@/lib/supabase/admin.server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "contacted", "won", "lost"];

export async function GET(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseService().from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { id?: string; status?: string; admin_notes?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Bad status." }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 4000);
  const { error } = await supabaseService().from("leads").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9: Admin leads page `src/app/admin/leads/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";

type Lead = {
  id: string; name: string; email: string; phone: string; business: string; category: string | null;
  template_key: string | null; tier: string | null; domain: string | null; notes: string | null;
  status: "new" | "contacted" | "won" | "lost"; admin_notes: string | null; created_at: string;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<{ leads: Lead[] }>("/api/admin/leads");
    if (!r.ok) setError(r.data.error ?? "Could not load leads.");
    else setLeads(r.data.leads);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(id: string, patch: Partial<Pick<Lead, "status" | "admin_notes">>) {
    const r = await apiFetch("/api/admin/leads", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
    if (!r.ok) setError(r.data.error ?? "Update failed.");
    else void load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Done-for-you leads</h1>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {leads === null ? <p className="text-sm">Loading…</p> : leads.length === 0 ? <p className="text-sm">No leads yet.</p> : null}
      {leads?.map((l) => (
        <div key={l.id} className={cardCls}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{l.business} <span className="text-sm text-koi-ink/60">· {l.name}</span></p>
              <p className="text-sm text-koi-ink/70">
                <a href={`mailto:${l.email}`}>{l.email}</a> · <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}>{l.phone}</a>
              </p>
              <p className="text-xs text-koi-ink/60">
                {new Date(l.created_at).toLocaleString()} · plan {l.tier ?? "-"} · template {l.template_key ?? "-"} · domain {l.domain ?? "-"}
              </p>
            </div>
            <select value={l.status} onChange={(e) => update(l.id, { status: e.target.value as Lead["status"] })} className="rounded-full px-3 py-1 text-sm ring-1 ring-koi-ink/10">
              {["new", "contacted", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {l.notes ? <p className="mt-3 whitespace-pre-wrap text-sm">{l.notes}</p> : null}
          <textarea
            defaultValue={l.admin_notes ?? ""}
            onBlur={(e) => e.target.value !== (l.admin_notes ?? "") && update(l.id, { admin_notes: e.target.value })}
            placeholder="Internal notes"
            rows={2}
            className="mt-3 w-full rounded-2xl px-3 py-2 text-sm ring-1 ring-koi-ink/10"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 10: Admin nav**

In `src/app/admin/layout.tsx`, change the super-admin entry so the list reads:

```tsx
          ...(isSuper
            ? [
                { href: "/admin/users", label: "Users", tourId: "nav-users" },
                { href: "/admin/leads", label: "Leads" },
                { href: "/admin/billing", label: "Billing" },
              ]
            : []),
```

(`/admin/billing` is built in Task 18; until then the link 404s — acceptable mid-plan.)

- [ ] **Step 11: Verify**

Run `npm test` and `npm run typecheck`. In the browser: `/start?template=t7&plan=commerce` preselects both; submit a test brief (dev env, test data) → success screen; as a super admin open `/admin/leads` → the lead shows; change status → persists after reload. (Needs migration 019; if not run yet, the API returns the 500 message — note it and re-check after the user runs it.)

- [ ] **Step 12: Commit**

```bash
git add src/lib/marketing/leadInput.ts src/app/api/leads/route.ts src/components/marketing/LeadForm.tsx src/app/start/page.tsx src/app/api/admin/leads/route.ts src/app/admin/leads/page.tsx src/app/admin/layout.tsx tests/leadInput.test.mjs
git commit -m "Done-for-you brief form, leads API and admin leads list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: Signup build API (trial site creation)

**Files:**
- Create: `src/lib/signup/fallbackSite.ts`, `src/lib/signup/suggest.ts`, `src/lib/signup/persistTrialSite.server.ts`, `src/lib/billing/signupSignals.server.ts`, `src/lib/supabase/requireUser.server.ts`, `src/app/api/signup/build/route.ts`
- Test: `tests/signupFallback.test.mjs`

**Interfaces:**
- Consumes: `emptyBrief`, `Brief` (`src/lib/ai/brief.ts`); `SiteProfile`, `buildSite` (`src/lib/ai/siteBuilder.ts`); `scoreTemplates`, `isTemplateKey`, `TEMPLATE_KEYS` (`src/lib/ai/templateChoice.ts`); `sampleSite` (`src/templates/sampleSite.ts`); `safeSlug` (Task 1); `normalizeEmail`, `normalizePhoneNg`, `isDisposableEmail`, `businessKey` (Task 3); `evaluateTrialSignup`, `canStartSite`, `PriorSignals` (Task 3); `listOwnedSites` (Task 6); `sendLifecycleEmail` (Task 6); `TRIAL_DAYS`, `isTier`, `isInterval` (Task 1); `DAY_MS` (Task 2).
- Produces: `SignupAnswers`, `SignupBody`, `parseSignupBody(body, isKey)`, `briefFromAnswers(answers, email)`, `TrialBuild`, `personalizeSample(templateKey, sample, answers, email)`, `suggestTemplates(answers)`, `insertTrialSite(db, name, templateKey)`, `persistTrialSite(db, siteId, build)`, `hashSignal(value, secret)`, `SignalKeys`, `collectPriorSignals(db, keys)`, `recordSignupSignal(db, row)`, `requireUser(req)`.
- HTTP: `POST /api/signup/build` with `Authorization: Bearer <access token>` and body `{ answers: SignupAnswers, templateKey, tier, interval }` → `200 { siteId, slug, usedAi, warnings }` | `4xx/5xx { error }`.

- [ ] **Step 1: Write the failing test**

`tests/signupFallback.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { briefFromAnswers, parseSignupBody, personalizeSample } from "../src/lib/signup/fallbackSite.ts";
import { suggestTemplates } from "../src/lib/signup/suggest.ts";
import { TEMPLATE_KEYS } from "../src/lib/ai/templateChoice.ts";

const answers = { businessName: "Bola's Bakes", whatTheyDo: "Custom cakes and pastries", city: "Ibadan", whatsapp: "08031234567", sellOnline: true };
const isKey = (k) => TEMPLATE_KEYS.includes(k);

test("parseSignupBody validates and normalises", () => {
  const r = parseSignupBody({ answers, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey);
  assert.equal(r.ok, true);
  assert.equal(r.value.answers.whatsapp, "+2348031234567");
  assert.equal(r.value.tier, "commerce");
  assert.equal(parseSignupBody({ answers: { ...answers, businessName: "B" }, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers: { ...answers, whatsapp: "12" }, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers, templateKey: "t99", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers, templateKey: "t14", tier: "gold", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody(null, isKey).ok, false);
});

test("brief carries the answers", () => {
  const b = briefFromAnswers({ ...answers, whatsapp: "+2348031234567" }, "bola@example.com");
  assert.equal(b.businessName, "Bola's Bakes");
  assert.equal(b.location, "Ibadan");
  assert.equal(b.contact.whatsapp, "+2348031234567");
  assert.equal(b.contact.email, "bola@example.com");
  assert.equal(b.shopIntent, true);
});

test("sample content gets the owner's name and contacts", () => {
  const sample = {
    profile: { business_name: "Ada \"Okafor\"", tagline: "x", description: "y" },
    pages: {
      home: { sections: [{ type: "hero", headline: "Welcome to Ada \"Okafor\"" }] },
      about: { sections: [] },
      contact: { sections: [] },
    },
  };
  const built = personalizeSample("t1", sample, { ...answers, whatsapp: "+2348031234567" }, "bola@example.com");
  assert.equal(built.templateKey, "t1");
  assert.equal(built.pages.home.sections[0].headline, "Welcome to Bola's Bakes");
  assert.equal(built.profile.business_name, "Bola's Bakes");
  assert.equal(built.profile.whatsapp, "+2348031234567");
  assert.equal(built.profile.email, "bola@example.com");
  assert.deepEqual(built.extraPages, []);
  assert.equal(sample.pages.home.sections[0].headline, "Welcome to Ada \"Okafor\"", "input not mutated");
});

test("three distinct real template suggestions", () => {
  for (const a of [answers, { ...answers, whatTheyDo: "", businessName: "", sellOnline: false }]) {
    const s = suggestTemplates(a);
    assert.equal(s.length, 3);
    assert.equal(new Set(s).size, 3);
    for (const k of s) assert.ok(TEMPLATE_KEYS.includes(k), k);
  }
  assert.deepEqual(suggestTemplates({ businessName: "", whatTheyDo: "", city: "", whatsapp: "", sellOnline: false }), ["t1", "t5", "t14"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/lib/signup/fallbackSite.ts`**

```ts
// Signup wizard answers → validated input, AI brief, or personalised sample content. Pure: relative imports only.
import type { PageData } from "../pageSchema.ts";
import type { SiteProfile } from "../ai/siteBuilder.ts";
import { emptyBrief, type Brief } from "../ai/brief.ts";
import { normalizePhoneNg } from "../billing/identity.ts";
import { isInterval, isTier, type Interval, type Tier } from "../marketing/pricing.ts";

export type SignupAnswers = { businessName: string; whatTheyDo: string; city: string; whatsapp: string; sellOnline: boolean };
export type SignupBody = { answers: SignupAnswers; templateKey: string; tier: Tier; interval: Interval };

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function parseSignupBody(body: unknown, isKey: (k: string) => boolean): { ok: true; value: SignupBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  const a = (b.answers && typeof b.answers === "object" ? b.answers : {}) as Record<string, unknown>;
  const businessName = text(a.businessName, 80);
  const whatTheyDo = text(a.whatTheyDo, 160);
  const city = text(a.city, 60);
  if (businessName.length < 2) return { ok: false, error: "Enter your business name." };
  if (whatTheyDo.length < 3) return { ok: false, error: "Tell us what your business does." };
  if (city.length < 2) return { ok: false, error: "Enter your city." };
  const whatsapp = normalizePhoneNg(a.whatsapp);
  if (!whatsapp) return { ok: false, error: "Enter a Nigerian WhatsApp number, e.g. 0803 123 4567." };
  if (typeof b.templateKey !== "string" || !isKey(b.templateKey)) return { ok: false, error: "Pick a design." };
  if (!isTier(b.tier)) return { ok: false, error: "Pick a plan." };
  if (!isInterval(b.interval)) return { ok: false, error: "Pick monthly or yearly." };
  return {
    ok: true,
    value: {
      answers: { businessName, whatTheyDo, city, whatsapp, sellOnline: a.sellOnline === true },
      templateKey: b.templateKey,
      tier: b.tier,
      interval: b.interval,
    },
  };
}

export function briefFromAnswers(a: SignupAnswers, email: string): Brief {
  const b = emptyBrief();
  return {
    ...b,
    businessName: a.businessName,
    whatTheyDo: a.whatTheyDo,
    location: a.city,
    contact: { ...b.contact, whatsapp: a.whatsapp, phone: a.whatsapp, email },
    shopIntent: a.sellOnline,
  };
}

export type TrialBuild = {
  templateKey: string;
  profile: SiteProfile;
  pages: { home: PageData; about: PageData; contact: PageData };
  extraPages: Array<{ key: string; label: string; data: PageData }>;
};

export type SampleLike = {
  profile: { business_name: string };
  pages: { home: PageData; about: PageData; contact: PageData };
};

const enc = (s: string) => JSON.stringify(s).slice(1, -1);

/** Template sample content with the sample business name swapped for the owner's, used when AI is unavailable. */
export function personalizeSample(templateKey: string, sample: SampleLike, a: SignupAnswers, email: string): TrialBuild {
  const from = sample.profile.business_name;
  const json = JSON.stringify(sample.pages);
  const pages = JSON.parse(from ? json.split(enc(from)).join(enc(a.businessName)) : json) as TrialBuild["pages"];
  return {
    templateKey,
    profile: {
      business_name: a.businessName,
      tagline: a.whatTheyDo,
      description: `${a.whatTheyDo} in ${a.city}.`,
      address: a.city,
      phone: a.whatsapp,
      email,
      whatsapp: a.whatsapp,
      socials: { instagram: null, facebook: null, twitter: null, tiktok: null },
    },
    pages,
    extraPages: [],
  };
}
```

- [ ] **Step 4: Implement `src/lib/signup/suggest.ts`**

```ts
// Three template suggestions for the signup wizard, with no AI call. Pure: relative imports only.
import { scoreTemplates } from "../ai/templateChoice.ts";
import { briefFromAnswers, type SignupAnswers } from "./fallbackSite.ts";

const DEFAULTS = ["t1", "t5", "t14"];
const SHOPS = ["t14", "t13"];

export function suggestTemplates(a: SignupAnswers): string[] {
  const scored = scoreTemplates(briefFromAnswers(a, ""))
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((s) => s.key);
  const ordered = [...scored, ...(a.sellOnline ? SHOPS : []), ...DEFAULTS];
  return [...new Set(ordered)].slice(0, 3);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test` — Expected: PASS. If the "empty answers" case does not return `["t1","t5","t14"]` because `scoreTemplates` scores an empty brief above zero, inspect `scoreTemplates` (`src/lib/ai/templateChoice.ts:37`) and filter on its `matched.length > 0` instead of `score > 0`.

- [ ] **Step 6: Implement `src/lib/supabase/requireUser.server.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UserCheck = { ok: true; userId: string; email: string } | { ok: false; response: NextResponse };

const fail = (error: string, status: number): UserCheck => ({ ok: false, response: NextResponse.json({ error }, { status }) });

/** Any signed-in user (Authorization: Bearer <supabase access token>) with a confirmed email. */
export async function requireUser(req: Request): Promise<UserCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fail("Supabase is not configured on the server.", 500);
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail("Not signed in.", 401);
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return fail("Session invalid or expired. Please sign in again.", 401);
  if (!data.user.email || !data.user.email_confirmed_at) return fail("Confirm your email first.", 403);
  return { ok: true, userId: data.user.id, email: data.user.email };
}
```

- [ ] **Step 7: Implement `src/lib/billing/signupSignals.server.ts`**

```ts
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PriorSignals } from "@/lib/billing/signupGuard";

export function hashSignal(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}

export type SignalKeys = {
  emailKey: string | null;
  phoneKey: string | null;
  deviceHash: string;
  ipHash: string;
  businessKey: string;
};

export async function collectPriorSignals(db: SupabaseClient, k: SignalKeys): Promise<PriorSignals> {
  const count = async (col: string, val: string | null, sinceMs?: number): Promise<number> => {
    if (!val) return 0;
    let q = db.from("signup_signals").select("id", { count: "exact", head: true }).eq(col, val);
    if (sinceMs) q = q.gte("created_at", new Date(Date.now() - sinceMs).toISOString());
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const [emailTrials, phoneTrials, deviceTrials, businessMatches, ipLastHour, ipLastDay] = await Promise.all([
    count("normalized_email", k.emailKey),
    count("phone_e164", k.phoneKey),
    count("device_hash", k.deviceHash),
    count("business_key", k.businessKey),
    count("ip_hash", k.ipHash, 60 * 60_000),
    count("ip_hash", k.ipHash, 24 * 60 * 60_000),
  ]);
  return { emailTrials, phoneTrials, deviceTrials, businessMatches, ipLastHour, ipLastDay };
}

export async function recordSignupSignal(
  db: SupabaseClient,
  row: SignalKeys & { userId: string; siteId: string; flags: string[] },
): Promise<void> {
  const { error } = await db.from("signup_signals").insert({
    user_id: row.userId,
    site_id: row.siteId,
    normalized_email: row.emailKey,
    phone_e164: row.phoneKey,
    device_hash: row.deviceHash,
    ip_hash: row.ipHash,
    business_key: row.businessKey,
    flags: row.flags,
  });
  if (error) console.error("[signup] signal insert failed", error.message);
}
```

- [ ] **Step 8: Implement `src/lib/signup/persistTrialSite.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { validatePageData } from "@/lib/pageSchema";
import { safeSlug } from "@/lib/reservedSlugs";
import { ensureShopEnabled, shopOnByDefault } from "@/lib/shop/autoEnable";
import type { TrialBuild } from "@/lib/signup/fallbackSite";

/** Inserts the site row (service role), trying "-2", "-3"… on slug clashes. The handle_new_site trigger adds profile + pages. */
export async function insertTrialSite(db: SupabaseClient, businessName: string, templateKey: string): Promise<{ siteId: string; slug: string } | null> {
  const base = safeSlug(businessName);
  for (let attempt = 1; attempt <= 8; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await db.from("sites").insert({ slug, template_key: templateKey }).select("id").single();
    if (!error && data) return { siteId: data.id as string, slug };
    if (error && error.code !== "23505") {
      console.error("[signup] site insert failed", error.message);
      return null;
    }
  }
  return null;
}

/** Writes profile + pages and publishes everything. Returns warnings; never throws for content problems. */
export async function persistTrialSite(db: SupabaseClient, siteId: string, build: TrialBuild): Promise<string[]> {
  const warnings: string[] = [];
  const now = new Date().toISOString();

  const p = build.profile;
  const payload: Record<string, unknown> = { business_name: p.business_name };
  for (const k of ["tagline", "description", "address", "phone", "email", "whatsapp"] as const) {
    if (p[k]) payload[k] = p[k];
  }
  const socials = Object.fromEntries(Object.entries(p.socials ?? {}).filter(([, v]) => !!v));
  if (Object.keys(socials).length) payload.socials = { instagram: null, facebook: null, twitter: null, tiktok: null, ...socials };
  const { error: profileErr } = await db.from("business_profiles").update(payload).eq("site_id", siteId);
  if (profileErr) warnings.push(`profile: ${profileErr.message}`);

  for (const key of ["home", "about", "contact"] as const) {
    const data = build.pages[key];
    if (!validatePageData(data).ok) {
      warnings.push(`${key}: invalid page data`);
      continue;
    }
    const { error } = await db.from("pages").update({ data, status: "published", published_at: now }).eq("site_id", siteId).eq("key", key);
    if (error) warnings.push(`${key}: ${error.message}`);
  }

  for (const extra of build.extraPages) {
    if (!validatePageData(extra.data).ok) continue;
    const { error } = await db
      .from("extra_pages")
      .insert({ site_id: siteId, key: extra.key, data: extra.data, status: "published", published_at: now });
    if (error) warnings.push(`${extra.key}: ${error.message}`);
  }

  const { error: siteErr } = await db.from("sites").update({ status: "published" }).eq("id", siteId);
  if (siteErr) warnings.push(`publish: ${siteErr.message}`);

  if (shopOnByDefault(build.templateKey) && !(await ensureShopEnabled(db, siteId, "new_site"))) {
    warnings.push("shop: could not be switched on");
  }
  return warnings;
}
```

- [ ] **Step 9: Implement `src/app/api/signup/build/route.ts`**

```ts
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isTemplateKey } from "@/lib/ai/templateChoice";
import { buildSite } from "@/lib/ai/siteBuilder";
import { sendLifecycleEmail } from "@/lib/billing/email.server";
import { businessKey, isDisposableEmail, normalizeEmail } from "@/lib/billing/identity";
import { canStartSite, evaluateTrialSignup } from "@/lib/billing/signupGuard";
import { collectPriorSignals, hashSignal, recordSignupSignal } from "@/lib/billing/signupSignals.server";
import { DAY_MS } from "@/lib/billing/subscriptionState";
import { listOwnedSites } from "@/lib/billing/subscriptions.server";
import { TRIAL_DAYS } from "@/lib/marketing/pricing";
import { clientIp } from "@/lib/shop/requestIp";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { briefFromAnswers, parseSignupBody, personalizeSample, type TrialBuild } from "@/lib/signup/fallbackSite";
import { insertTrialSite, persistTrialSite } from "@/lib/signup/persistTrialSite.server";
import { supabaseService } from "@/lib/supabase/admin.server";
import { requireUser } from "@/lib/supabase/requireUser.server";
import { sampleSite } from "@/templates/sampleSite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEVICE_COOKIE = "sv_dev";
const AI_BUDGET_MS = 40_000;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = shopRateLimit(`signup-build:${ip}`, 5, 60 * 60_000);
  if (limited) return limited;

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseSignupBody(body, isTemplateKey);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { answers, templateKey, tier, interval } = parsed.value;

  const secret = process.env.SIGNUP_SECRET;
  if (!secret) return json({ error: "Signup is not available right now." }, 503);
  const db = supabaseService();

  let owned;
  try {
    owned = await listOwnedSites(db, auth.userId);
  } catch {
    return json({ error: "Could not check your account. Please try again." }, 500);
  }
  // A retry after a dropped connection returns the site that was just created.
  const recent = owned.find((o) => Date.now() - Date.parse(o.createdAt) < 10 * 60_000 && (o.status === "trialing" || o.status === "paused"));
  if (recent) return json({ siteId: recent.siteId, slug: recent.slug, usedAi: false, warnings: [] });

  const start = canStartSite(owned);
  if (!start.ok) return json({ error: start.error }, 409);

  const jar = await cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value || randomUUID();
  const email = normalizeEmail(auth.email);
  const keys = {
    emailKey: email,
    phoneKey: answers.whatsapp,
    deviceHash: hashSignal(deviceId, secret),
    ipHash: hashSignal(ip, secret),
    businessKey: businessKey(answers.businessName, answers.city),
  };

  let flags: string[] = [];
  if (start.trial) {
    let prior;
    try {
      prior = await collectPriorSignals(db, keys);
    } catch {
      return json({ error: "Signup is not available right now." }, 503);
    }
    const verdict = evaluateTrialSignup({ email, disposable: !!email && isDisposableEmail(email), prior });
    if (!verdict.allow) return json({ error: verdict.error }, verdict.status);
    flags = verdict.flags;
  }

  const created = await insertTrialSite(db, answers.businessName, templateKey);
  if (!created) return json({ error: "Could not create your site. Please try again." }, 500);
  const { siteId, slug } = created;
  const rollback = async () => {
    await db.from("sites").delete().eq("id", siteId);
  };

  const { error: memberErr } = await db.from("site_members").insert({ site_id: siteId, user_id: auth.userId, role: "owner" });
  if (memberErr) {
    await rollback();
    return json({ error: "Could not create your site. Please try again." }, 500);
  }

  const now = Date.now();
  const { error: subErr } = await db.from("site_subscriptions").insert({
    site_id: siteId,
    owner_id: auth.userId,
    tier,
    interval,
    status: start.trial ? "trialing" : "paused",
    trial_ends_at: start.trial ? new Date(now + TRIAL_DAYS * DAY_MS).toISOString() : null,
    paused_at: start.trial ? null : new Date(now).toISOString(),
    flagged: flags.length ? flags.join(",") : null,
  });
  if (subErr) {
    await rollback();
    return json({ error: subErr.code === "23505" ? "You already have a site on a free trial." : "Could not create your site. Please try again." }, subErr.code === "23505" ? 409 : 500);
  }

  let build: TrialBuild;
  let usedAi = true;
  try {
    const result = await withTimeout(buildSite({ state: briefFromAnswers(answers, auth.email), templateOverride: templateKey }), AI_BUDGET_MS);
    build = { templateKey, profile: result.profile, pages: result.pages, extraPages: result.extraPages };
  } catch (err) {
    usedAi = false;
    console.warn("[signup] AI build failed, using sample content", err instanceof Error ? err.message : "error");
    build = personalizeSample(templateKey, sampleSite(templateKey), answers, auth.email);
  }
  const warnings = await persistTrialSite(db, siteId, build);

  await recordSignupSignal(db, { ...keys, userId: auth.userId, siteId, flags });
  if (start.trial) await sendLifecycleEmail(db, siteId, "welcome");

  const res = json({ siteId, slug, usedAi, warnings });
  res.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
```

- [ ] **Step 10: Typecheck and commit**

Run: `npm run typecheck` and `npm test` — Expected: no new errors; PASS. (If `sampleSite(templateKey)` is not assignable to `SampleLike` because `pages` is typed loosely, pass `sampleSite(templateKey) as unknown as SampleLike` and import the type.)

```bash
git add src/lib/signup src/lib/billing/signupSignals.server.ts src/lib/supabase/requireUser.server.ts src/app/api/signup/build/route.ts tests/signupFallback.test.mjs
git commit -m "Signup: trial site build API with abuse checks and sample fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Signup wizard UI

**Files:**
- Create: `src/components/marketing/SignupWizard.tsx`, `src/app/signup/page.tsx`

**Interfaces:**
- Consumes: `supabaseBrowser` (`src/lib/supabase/browser.ts`); `suggestTemplates`, `SignupAnswers` (Task 13); `offeredPlans`, `PLAN_INFO`, `TIERS`, `TRIAL_DAYS`, `formatNaira`, `isTier`, `isInterval` (Task 1); `normalizePhoneNg` (Task 3); `TEMPLATE_META`, `templateSupportsShop` (`src/templates/meta.ts`); `MarketingShell` (Task 9); `POST /api/signup/build` (Task 13).

- [ ] **Step 1: Configure Supabase email OTP (user action)**

Ask the user to, in Supabase → Authentication → Email Templates → "Confirm signup", include the code: add a line `Your code: {{ .Token }}` to the template. Confirm "Confirm email" is enabled (Authentication → Providers → Email). Record this in the README in Task 19.

- [ ] **Step 2: Implement `src/components/marketing/SignupWizard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { normalizePhoneNg } from "@/lib/billing/identity";
import {
  PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, isInterval, isTier, offeredPlans,
  type Interval, type Tier,
} from "@/lib/marketing/pricing";
import type { SignupAnswers } from "@/lib/signup/fallbackSite";
import { suggestTemplates } from "@/lib/signup/suggest";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TEMPLATE_META, templateSupportsShop } from "@/templates/meta";

type Step = 1 | 2 | 3 | 4 | 5;
type Saved = { step: Step; answers: SignupAnswers; templateKey: string; tier: Tier; interval: Interval };

const STORAGE_KEY = "sv-signup";
const LABELS = ["Your business", "Pick a look", "Pick a plan", "Your account", "Building"];
const BUILD_MESSAGES = ["Setting up your site…", "Writing your pages…", "Choosing photos…", "Publishing…"];
const input = "w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-koi-ink/10 focus:outline-none focus:ring-2 focus:ring-koi-deep";

function load(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function save(s: Saved) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode: wizard still works without persistence */
  }
}

export default function SignupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [s, setS] = useState<Saved>(() => ({
    step: 1,
    answers: { businessName: "", whatTheyDo: "", city: "", whatsapp: "", sellOnline: false },
    templateKey: TEMPLATE_META.some((t) => t.key === params.get("template")) ? params.get("template")! : "",
    tier: isTier(params.get("plan")) ? (params.get("plan") as Tier) : "business",
    interval: isInterval(params.get("interval")) ? (params.get("interval") as Interval) : "monthly",
  }));
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = load();
    if (saved && saved.step < 5) setS(saved);
    void supabaseBrowser().auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);
  useEffect(() => save(s), [s]);

  const set = (patch: Partial<Saved>) => setS((prev) => ({ ...prev, ...patch }));
  const setAnswer = (patch: Partial<SignupAnswers>) => setS((prev) => ({ ...prev, answers: { ...prev.answers, ...patch } }));
  const go = (step: Step) => { setError(null); set({ step }); };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <ol className="flex gap-2 overflow-x-auto text-xs">
        {LABELS.map((l, i) => (
          <li key={l} className={`whitespace-nowrap rounded-full px-3 py-1 ${s.step === i + 1 ? "bg-koi-ink text-white" : s.step > i + 1 ? "bg-koi-deep/10 text-koi-deep" : "bg-white text-koi-ink/50"}`}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>
      <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
        {error ? <p className="mb-4 rounded-2xl bg-koi-orange/10 px-4 py-3 text-sm text-koi-orange">{error}</p> : null}
        {s.step === 1 ? <BusinessStep s={s} setAnswer={setAnswer} onNext={() => go(2)} setError={setError} /> : null}
        {s.step === 2 ? <LookStep s={s} set={set} onBack={() => go(1)} onNext={() => go(3)} /> : null}
        {s.step === 3 ? <PlanStep s={s} set={set} onBack={() => go(2)} onNext={() => go(hasSession ? 5 : 4)} /> : null}
        {s.step === 4 ? <AccountStep onBack={() => go(3)} onDone={() => { setHasSession(true); go(5); }} setError={setError} /> : null}
        {s.step === 5 ? (
          <BuildStep
            s={s}
            onError={(msg) => { setError(msg); }}
            onDone={(siteId) => {
              try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
              router.push(`/dashboard/${siteId}?welcome=1`);
            }}
          />
        ) : null}
      </div>
      <p className="mt-4 text-center text-xs text-koi-ink/50">
        Already have an account? <Link href="/login" className="text-koi-deep">Sign in</Link>
      </p>
    </div>
  );
}

function Nav({ onBack, next, disabled }: { onBack?: () => void; next: string; disabled?: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {onBack ? <button type="button" onClick={onBack} className="text-sm text-koi-ink/60">← Back</button> : <span />}
      <button type="submit" disabled={disabled} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-50">{next}</button>
    </div>
  );
}

function BusinessStep({ s, setAnswer, onNext, setError }: {
  s: Saved; setAnswer: (p: Partial<SignupAnswers>) => void; onNext: () => void; setError: (e: string | null) => void;
}) {
  const a = s.answers;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!normalizePhoneNg(a.whatsapp)) return setError("Enter a Nigerian WhatsApp number, e.g. 0803 123 4567.");
        onNext();
      }}
    >
      <h1 className="text-2xl font-semibold">Tell us about your business</h1>
      <div className="mt-6 grid gap-4">
        <input required minLength={2} maxLength={80} placeholder="Business name" value={a.businessName} onChange={(e) => setAnswer({ businessName: e.target.value })} className={input} />
        <input required minLength={3} maxLength={160} placeholder="What do you do? e.g. Custom cakes for weddings" value={a.whatTheyDo} onChange={(e) => setAnswer({ whatTheyDo: e.target.value })} className={input} />
        <div className="grid gap-4 sm:grid-cols-2">
          <input required minLength={2} maxLength={60} placeholder="City" value={a.city} onChange={(e) => setAnswer({ city: e.target.value })} className={input} />
          <input required placeholder="WhatsApp number" inputMode="tel" value={a.whatsapp} onChange={(e) => setAnswer({ whatsapp: e.target.value })} className={input} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={a.sellOnline} onChange={(e) => setAnswer({ sellOnline: e.target.checked })} className="size-4 accent-koi-deep" />
          I want to sell products or take food orders online
        </label>
      </div>
      <Nav next="Next" />
    </form>
  );
}

function LookStep({ s, set, onBack, onNext }: { s: Saved; set: (p: Partial<Saved>) => void; onBack: () => void; onNext: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const suggested = useMemo(() => suggestTemplates(s.answers), [s.answers]);
  const keys = showAll ? TEMPLATE_META.map((t) => t.key) : [...new Set([...(s.templateKey ? [s.templateKey] : []), ...suggested])];
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (s.templateKey) onNext(); }}>
      <h1 className="text-2xl font-semibold">Pick a look</h1>
      <p className="mt-1 text-sm text-koi-ink/60">{showAll ? "All designs." : "Our picks for your business."} You can change words, photos and colours later.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {keys.map((k) => {
          const t = TEMPLATE_META.find((m) => m.key === k)!;
          const on = s.templateKey === k;
          return (
            <button key={k} type="button" onClick={() => set({ templateKey: k })} className={`rounded-2xl p-2 text-left ring-2 ${on ? "ring-koi-deep" : "ring-transparent hover:ring-koi-ink/10"}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-koi-paper">
                <iframe src={`/templates/${k}?thumb=1`} title={`${t.name} preview`} loading="lazy" tabIndex={-1} aria-hidden className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-25 border-0" />
              </div>
              <p className="mt-2 text-sm font-medium">{t.name}</p>
              <p className="text-xs text-koi-ink/60">{t.category}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-koi-deep">{showAll ? "Show our picks" : `See all ${TEMPLATE_META.length}`}</button>
        {s.templateKey ? <a href={`/templates/${s.templateKey}`} target="_blank" rel="noopener" className="text-koi-deep">Preview full site ↗</a> : null}
      </div>
      <Nav onBack={onBack} next="Next" disabled={!s.templateKey} />
    </form>
  );
}

function PlanStep({ s, set, onBack, onNext }: { s: Saved; set: (p: Partial<Saved>) => void; onBack: () => void; onNext: () => void }) {
  const plans = offeredPlans();
  const wantsShop = s.answers.sellOnline || templateSupportsShop(s.templateKey);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <h1 className="text-2xl font-semibold">Pick a plan</h1>
      <p className="mt-1 text-sm text-koi-ink/60">₦0 today · {TRIAL_DAYS} days free · no card</p>
      <div className="mt-4 inline-flex rounded-full bg-koi-paper p-1 ring-1 ring-koi-ink/10">
        {(["monthly", "annually"] as const).map((i) => (
          <button key={i} type="button" onClick={() => set({ interval: i })} className={`rounded-full px-4 py-2 text-sm ${s.interval === i ? "bg-koi-ink text-white" : "text-koi-ink/70"}`}>
            {i === "monthly" ? "Monthly" : "Yearly · 2 months free"}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {TIERS.map((tier) => {
          const p = plans.find((x) => x.tier === tier && x.interval === s.interval)!;
          const on = s.tier === tier;
          return (
            <button key={tier} type="button" onClick={() => set({ tier })} className={`flex items-center justify-between gap-4 rounded-2xl p-4 text-left ring-2 ${on ? "ring-koi-deep" : "ring-koi-ink/10"}`}>
              <span>
                <span className="font-medium">{PLAN_INFO[tier].name}</span>
                <span className="block text-sm text-koi-ink/60">{PLAN_INFO[tier].blurb}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-semibold">{formatNaira(p.price)}</span>
                <span className="text-sm text-koi-ink/60">{s.interval === "monthly" ? "/mo" : "/yr"}</span>
                {p.launch ? <span className="block text-xs text-koi-ink/40 line-through">{formatNaira(p.standardPrice)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {wantsShop && s.tier !== "commerce" ? (
        <p className="mt-4 rounded-2xl bg-koi-deep/5 p-4 text-sm">
          Selling online needs the Commerce plan.{" "}
          <button type="button" onClick={() => set({ tier: "commerce" })} className="font-medium text-koi-deep">Switch to Commerce</button>
        </p>
      ) : null}
      <p className="mt-4 text-xs text-koi-ink/50">You won't be charged now. Pick a card before day {TRIAL_DAYS} to keep your site live.</p>
      <Nav onBack={onBack} next="Next" />
    </form>
  );
}

function AccountStep({ onBack, onDone, setError }: { onBack: () => void; onDone: () => void; setError: (e: string | null) => void }) {
  const [phase, setPhase] = useState<"form" | "code">("form");
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const supabase = supabaseBrowser();

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return setError("This email already has an account. Sign in, then come back to add a site.");
    }
    if (data.session) return onDone();
    setPhase("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
    setBusy(false);
    if (error || !data.session) return setError(error?.message ?? "That code didn't work. Check the latest email and try again.");
    onDone();
  }

  async function resend() {
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setError(error ? error.message : "We sent a new code.");
  }

  if (phase === "code") {
    return (
      <form onSubmit={verify}>
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-1 text-sm text-koi-ink/60">We sent a 6-digit code to {email}.</p>
        <input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${input} mt-6 text-center text-2xl tracking-[0.5em]`} />
        <button type="button" onClick={resend} className="mt-3 text-sm text-koi-deep">Send a new code</button>
        <Nav onBack={() => setPhase("form")} next={busy ? "Checking…" : "Verify and build my site"} disabled={busy || code.length !== 6} />
      </form>
    );
  }
  return (
    <form onSubmit={signUp}>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <div className="mt-6 grid gap-4">
        <input required placeholder="Your full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        <input required type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input required type="password" minLength={8} placeholder="Password (8+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </div>
      <Nav onBack={onBack} next={busy ? "Creating…" : "Create account"} disabled={busy} />
    </form>
  );
}

function BuildStep({ s, onDone, onError }: { s: Saved; onDone: (siteId: string) => void; onError: (msg: string) => void }) {
  const [msg, setMsg] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => Math.min(m + 1, BUILD_MESSAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFailed(false);
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/signup/build", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ answers: s.answers, templateKey: s.templateKey, tier: s.tier, interval: s.interval }),
      });
      const body = (await res.json().catch(() => ({}))) as { siteId?: string; error?: string };
      if (cancelled) return;
      if (res.ok && body.siteId) onDone(body.siteId);
      else {
        setFailed(true);
        onError(body.error ?? "Something went wrong while building your site.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <div className="py-10 text-center">
      {failed ? (
        <button type="button" onClick={() => { setMsg(0); setAttempt((n) => n + 1); }} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white">Try again</button>
      ) : (
        <>
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-koi-deep/20 border-t-koi-deep" />
          <p className="mt-6 text-lg font-medium">{BUILD_MESSAGES[msg]}</p>
          <p className="mt-1 text-sm text-koi-ink/60">This takes up to a minute.</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/app/signup/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import MarketingShell from "@/components/marketing/MarketingShell";
import SignupWizard from "@/components/marketing/SignupWizard";

export const metadata: Metadata = {
  title: "Start your free trial — Sulva Sites",
  description: "Build your business website in a few minutes. 7 days free, no card.",
};

export default function SignupPage() {
  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <SignupWizard />
      </Suspense>
    </MarketingShell>
  );
}
```

- [ ] **Step 4: Verify in the browser (needs migration 019, `SIGNUP_SECRET` in `.env.local`, and the OTP template)**

On `localhost`: open `/signup?template=t5&plan=business`. Step 1 rejects `12` as WhatsApp. Step 2 shows Maison selected plus suggestions; "See all 17" works. Step 3 shows ₦7,000/mo with struck ₦20,000; ticking "sell online" in step 1 shows the Commerce nudge. Step 4: create a test account with an address you control (the user's own test inbox; ask the user for one if needed), enter the emailed code. Step 5 builds and redirects to `/dashboard/<id>?welcome=1`. Then: open `/<slug>` → site renders with the "Built with Sulva Sites" badge. Repeat signup from another email on the same browser → succeeds but the admin flag `device_reused` is set (check `site_subscriptions.flagged`). Signing in as the first account and opening `/signup?add=1` skips step 4 and the build returns 409 "Activate … before adding another site." Refresh mid-wizard keeps answers. Mobile preset: no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/SignupWizard.tsx src/app/signup/page.tsx
git commit -m "Signup wizard: business, look, plan, account, build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 15: Paystack billing — plans script, checkout, webhook, verify

**Files:**
- Create: `src/lib/billing/paystackBilling.server.ts`, `src/lib/billing/webhook.server.ts`, `src/app/api/billing/checkout/route.ts`, `scripts/paystack-plans.mjs`
- Modify: `src/lib/shop/webhook.server.ts` (dispatch billing events)

**Interfaces:**
- Consumes: `paystackRequest`, `PaystackError` (`src/lib/shop/paystack.server.ts`); `parseBillingEvent`, `isBillingWebhook`, `subscriptionStartDate`, `addInterval`, `BillingEvent` (Task 4); `newBillingReference`, `isBillingReference` (Task 4); `canTransition`, `GRACE_DAYS`, `DAY_MS`, `SubStatus` (Task 2); `loadSubscription`, `SUB_COLUMNS`, `SubscriptionRow` (Task 6); `planId`, `isTier`, `isInterval`, `isPromoActive`, `intervalPrice`, `INTERVALS`, `TIERS`, `PLAN_INFO` (Task 1); `requireSiteRole`, `rateLimit` (`src/lib/supabase/*`); `platformOrigin` (Task 6).
- Produces: `initializeCheckout`, `verifyTransaction`, `createSubscription`, `disableSubscription`, `manageLink`; `SettleResult`, `settleFirstCharge(db, ev)`, `applySubscriptionEvent(db, ev)`, `handleBillingWebhook(db, event)`.
- HTTP: `POST /api/billing/checkout { siteId, tier, interval }` (owner bearer) → `{ url }`.

- [ ] **Step 1: `src/lib/billing/paystackBilling.server.ts`**

```ts
import { PaystackError, paystackRequest } from "@/lib/shop/paystack.server";
import { isBillingReference } from "@/lib/billing/reference";

function secret(): string {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new PaystackError(500, "Paystack is not configured");
  return s;
}

export async function initializeCheckout(i: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string }> {
  return paystackRequest<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    secret: secret(),
    body: {
      email: i.email,
      amount: i.amountKobo,
      reference: i.reference,
      currency: "NGN",
      channels: ["card"],
      callback_url: i.callbackUrl,
      metadata: i.metadata,
    },
  });
}

export async function verifyTransaction(reference: string): Promise<Record<string, unknown>> {
  if (!isBillingReference(reference)) throw new PaystackError(400, "Invalid reference");
  return paystackRequest<Record<string, unknown>>(`/transaction/verify/${reference}`, { secret: secret() });
}

export async function createSubscription(i: { customer: string; plan: string; authorization: string; startDate: Date }) {
  return paystackRequest<{ subscription_code: string; email_token: string }>("/subscription", {
    method: "POST",
    secret: secret(),
    body: { customer: i.customer, plan: i.plan, authorization: i.authorization, start_date: i.startDate.toISOString() },
  });
}

export async function disableSubscription(code: string, token: string): Promise<void> {
  await paystackRequest<unknown>("/subscription/disable", { method: "POST", secret: secret(), body: { code, token } });
}

/** Paystack-hosted page where the owner updates their card. */
export async function manageLink(code: string): Promise<string> {
  if (!/^SUB_[A-Za-z0-9]+$/.test(code)) throw new PaystackError(400, "Invalid subscription");
  const data = await paystackRequest<{ link: string }>(`/subscription/${code}/manage/link`, { secret: secret() });
  return data.link;
}
```

- [ ] **Step 2: `src/lib/billing/webhook.server.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSubscription, disableSubscription } from "@/lib/billing/paystackBilling.server";
import { canTransition, DAY_MS, GRACE_DAYS, type SubStatus } from "@/lib/billing/subscriptionState";
import { loadSubscription, SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { addInterval, parseBillingEvent, subscriptionStartDate, type BillingEvent } from "@/lib/billing/webhookEvents";
import type { Interval } from "@/lib/marketing/pricing";

type FirstCharge = Extract<BillingEvent, { kind: "first_charge" }>;
type SubEvent = Exclude<BillingEvent, { kind: "ignore" } | { kind: "first_charge" }>;
export type SettleResult = "settled" | "already" | "unknown" | "mismatch" | "error";

const NO_STORE = { "Cache-Control": "no-store" };

/** Platform webhook → billing. 5xx makes Paystack retry; everything else is acknowledged. */
export async function handleBillingWebhook(db: SupabaseClient, event: unknown): Promise<NextResponse> {
  const ev = parseBillingEvent(event);
  try {
    if (ev.kind === "ignore") return NextResponse.json({ ok: true, ignored: "event" }, { headers: NO_STORE });
    const result = ev.kind === "first_charge" ? await settleFirstCharge(db, ev) : await applySubscriptionEvent(db, ev);
    if (result === "error") return NextResponse.json({ error: "Billing webhook failed" }, { status: 500, headers: NO_STORE });
    return NextResponse.json({ ok: true, result }, { headers: NO_STORE });
  } catch (err) {
    console.error("[billing] webhook failed", { kind: ev.kind, error: err instanceof Error ? err.message : "error" });
    return NextResponse.json({ error: "Billing webhook failed" }, { status: 500, headers: NO_STORE });
  }
}

/**
 * First payment for a plan (new subscription or plan change). Used by the webhook and by the
 * callback verify path; the pending → paid claim makes it run once.
 */
export async function settleFirstCharge(db: SupabaseClient, ev: FirstCharge): Promise<SettleResult> {
  const { data: pending, error } = await db
    .from("billing_events")
    .select("id, site_id, plan_id, amount_kobo, status")
    .eq("event_key", ev.reference)
    .maybeSingle();
  if (error) return "error";
  if (!pending?.site_id || !pending.plan_id) return "unknown";
  if (pending.status === "paid") return "already";
  if (pending.status !== "pending") return "unknown";

  const { data: plan } = await db
    .from("billing_plans")
    .select("id, tier, interval, price_kobo, paystack_plan_code")
    .eq("id", pending.plan_id)
    .maybeSingle();
  if (!plan) return "unknown";
  if (ev.currency !== "NGN" || ev.amountKobo !== Number(plan.price_kobo) || ev.amountKobo !== Number(pending.amount_kobo)) {
    await db.from("billing_events").update({ status: "mismatch", summary: { amount_kobo: ev.amountKobo, currency: ev.currency } }).eq("id", pending.id);
    return "mismatch";
  }

  const { data: claimed, error: claimErr } = await db
    .from("billing_events")
    .update({ status: "paid", summary: { paid_at: new Date().toISOString() } })
    .eq("id", pending.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return "error";
  if (!claimed?.length) return "already";
  const unclaim = async () => {
    await db.from("billing_events").update({ status: "pending" }).eq("id", pending.id);
  };

  const siteId = pending.site_id as string;
  const interval = plan.interval as Interval;
  const sub = await loadSubscription(db, siteId);
  const paidThrough = sub && ["active", "cancelling", "past_due"].includes(sub.status) ? sub.current_period_end : null;
  const periodEnd = subscriptionStartDate(new Date(), sub?.trial_ends_at ?? null, paidThrough, interval);

  let newCode: string | null = null;
  let emailToken: string | null = null;
  let problem: string | null = null;
  if (ev.reusable && ev.authorizationCode && ev.customerCode && plan.paystack_plan_code) {
    try {
      const created = await createSubscription({
        customer: ev.customerCode,
        plan: plan.paystack_plan_code as string,
        authorization: ev.authorizationCode,
        startDate: periodEnd,
      });
      newCode = created.subscription_code;
      emailToken = created.email_token;
    } catch (err) {
      problem = "renewal_setup_failed";
      console.error("[billing] create subscription failed", { siteId, error: err instanceof Error ? err.message : "error" });
    }
  } else {
    problem = "card_not_reusable";
  }

  const oldCode = sub?.paystack_subscription_code ?? null;
  const { data: oldSecret } = oldCode
    ? await db.from("billing_secrets").select("email_token").eq("site_id", siteId).maybeSingle()
    : { data: null };

  // Without a renewing Paystack subscription the paid period still counts, then the site pauses.
  const patch = {
    tier: plan.tier,
    interval,
    plan_id: plan.id,
    status: newCode ? "active" : "cancelling",
    current_period_end: periodEnd.toISOString(),
    trial_ends_at: null,
    grace_ends_at: null,
    paused_at: null,
    paystack_customer_code: ev.customerCode,
    paystack_subscription_code: newCode,
    flagged: problem ?? sub?.flagged ?? null,
  };
  const { error: writeErr } = sub
    ? await db.from("site_subscriptions").update(patch).eq("site_id", siteId)
    : await db.from("site_subscriptions").insert({ ...patch, site_id: siteId });
  if (writeErr) {
    console.error("[billing] subscription write failed", writeErr.message);
    await unclaim();
    return "error";
  }

  await db
    .from("billing_secrets")
    .upsert({ site_id: siteId, authorization_code: ev.authorizationCode, email_token: emailToken, updated_at: new Date().toISOString() });
  if (sub?.status === "archived") {
    await db.from("sites").update({ status: "published" }).eq("id", siteId).eq("status", "suspended");
  }
  // Disable the old Paystack subscription only now: the row points at the new code, so its disable webhook is ignored.
  if (oldCode && oldCode !== newCode && oldSecret?.email_token) {
    await disableSubscription(oldCode, oldSecret.email_token as string).catch((err) =>
      console.error("[billing] old subscription not disabled", { oldCode, error: err instanceof Error ? err.message : "error" }),
    );
  }
  return "settled";
}

export async function applySubscriptionEvent(db: SupabaseClient, ev: SubEvent): Promise<string> {
  const { data: seen, error: seenErr } = await db.from("billing_events").select("id").eq("event_key", ev.key).maybeSingle();
  if (seenErr) return "error";
  if (seen) return "already";

  const { data: row, error } = await db
    .from("site_subscriptions")
    .select(SUB_COLUMNS)
    .eq("paystack_subscription_code", ev.subscriptionCode)
    .maybeSingle();
  if (error) return "error";
  if (!row) return "unknown_subscription";
  const sub = row as SubscriptionRow;
  const now = new Date();

  let patch: Record<string, unknown>;
  switch (ev.kind) {
    case "invoice_paid":
      patch = {
        status: "active",
        current_period_end: ev.nextPaymentDate ?? addInterval(now, sub.interval).toISOString(),
        grace_ends_at: null,
        paused_at: null,
      };
      break;
    case "payment_failed":
      patch = { status: "past_due", grace_ends_at: new Date(now.getTime() + GRACE_DAYS * DAY_MS).toISOString() };
      break;
    case "not_renew":
      patch = { status: "cancelling" };
      break;
    case "disabled": {
      const stillPaid = !!sub.current_period_end && Date.parse(sub.current_period_end) > now.getTime();
      patch = stillPaid ? { status: "cancelling" } : { status: "paused", paused_at: now.toISOString() };
      break;
    }
  }
  const next = patch.status as SubStatus;
  const allowed = next === sub.status || canTransition(sub.status, next);
  if (allowed) {
    const { error: upErr } = await db.from("site_subscriptions").update(patch).eq("site_id", sub.site_id);
    if (upErr) return "error";
  }
  const { error: insErr } = await db.from("billing_events").insert({
    event_key: ev.key,
    kind: ev.kind,
    site_id: sub.site_id,
    amount_kobo: ev.kind === "invoice_paid" ? ev.amountKobo : null,
    status: allowed ? "done" : "skipped",
  });
  if (insErr && insErr.code !== "23505") return "error";
  return allowed ? "applied" : "skipped";
}
```

- [ ] **Step 3: Dispatch billing events from the platform webhook**

In `src/lib/shop/webhook.server.ts` add imports:

```ts
import { handleBillingWebhook } from "@/lib/billing/webhook.server";
import { isBillingWebhook } from "@/lib/billing/webhookEvents";
```

Then, directly after the `try { event = JSON.parse(raw); } catch { return ok({ ignored: "bad_json" }); }` block and **before** the `event.event !== "charge.success"` check, insert:

```ts
  // Subscription billing shares Sulvatech's single Paystack webhook URL.
  if (scope.kind === "platform" && isBillingWebhook(event)) {
    const billingDb = requireServiceClient();
    if (!billingDb) return status(500, SHOP_NOT_CONFIGURED);
    return handleBillingWebhook(billingDb, event);
  }
```

Check `requireServiceClient()`'s return type is a `SupabaseClient` (`src/lib/shop/serviceClient.server.ts`); if it is a narrower type, cast with `as unknown as SupabaseClient` at this call.

- [ ] **Step 4: `src/app/api/billing/checkout/route.ts`**

```ts
import { NextResponse } from "next/server";

import { platformOrigin } from "@/lib/billing/email.server";
import { initializeCheckout } from "@/lib/billing/paystackBilling.server";
import { newBillingReference } from "@/lib/billing/reference";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { isInterval, isPromoActive, isTier, planId } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { siteId?: unknown; tier?: unknown; interval?: unknown } | null;
  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  const auth = await requireSiteRole(req, siteId, ["owner"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`billing-checkout:${auth.userId}`, { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;
  if (!isTier(body?.tier) || !isInterval(body?.interval)) return json({ error: "Pick a plan." }, 400);
  if (!auth.email) return json({ error: "Your account has no email address." }, 400);

  const db = supabaseService();
  const sub = await loadSubscription(db, siteId);
  if (!sub || sub.status === "manual") return json({ error: "This site is billed by Sulvatech directly." }, 409);
  if (sub.blocked) return json({ error: "This site is on hold. Please contact Sulvatech." }, 403);

  const id = planId(body.tier, body.interval, isPromoActive());
  const { data: plan } = await db.from("billing_plans").select("id, price_kobo, paystack_plan_code").eq("id", id).maybeSingle();
  if (!plan?.paystack_plan_code) return json({ error: "Plans are not set up yet. Please try again later." }, 503);

  const reference = newBillingReference();
  const { error: pendErr } = await db.from("billing_events").insert({
    event_key: reference, kind: "checkout", site_id: siteId, plan_id: plan.id, amount_kobo: plan.price_kobo, status: "pending",
  });
  if (pendErr) return json({ error: "Could not start checkout." }, 500);

  try {
    const init = await initializeCheckout({
      email: auth.email,
      amountKobo: Number(plan.price_kobo),
      reference,
      callbackUrl: `${platformOrigin()}/dashboard/${siteId}/billing?ref=${reference}`,
      metadata: { kind: "subscription", siteId, planId: plan.id },
    });
    return json({ url: init.authorization_url });
  } catch (err) {
    console.error("[billing] initialize failed", err instanceof Error ? err.message : "error");
    return json({ error: "Could not reach Paystack. Please try again." }, 502);
  }
}
```

- [ ] **Step 5: `scripts/paystack-plans.mjs`**

```js
// Creates (or finds) the 12 Paystack plans from src/lib/marketing/pricing.ts and upserts public.billing_plans.
// Test mode first, live later (plan codes differ per mode — re-run with the live key when going live).
// Usage: node --env-file=.env.local --experimental-strip-types --no-warnings scripts/paystack-plans.mjs
import { INTERVALS, PLAN_INFO, TIERS, intervalPrice, planId } from "../src/lib/marketing/pricing.ts";

const secret = process.env.PAYSTACK_SECRET_KEY;
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || !supaUrl || !serviceKey) {
  console.error("Set PAYSTACK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
console.log(`Paystack mode: ${secret.startsWith("sk_live_") ? "LIVE" : "test"}`);

async function ps(path, init = {}) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== true) throw new Error(`${path}: ${body.message ?? res.status}`);
  return body;
}

const existing = new Map();
for (let page = 1; ; page++) {
  const body = await ps(`/plan?perPage=100&page=${page}`);
  for (const p of body.data) existing.set(p.name, p);
  if (body.data.length < 100) break;
}

const rows = [];
for (const tier of TIERS) {
  for (const interval of INTERVALS) {
    for (const launch of [true, false]) {
      const id = planId(tier, interval, launch);
      const amount = intervalPrice(tier, interval, launch) * 100;
      const name = `Sulva Sites ${PLAN_INFO[tier].name} ${interval}${launch ? " (launch)" : ""}`;
      let plan = existing.get(name);
      if (plan && plan.amount !== amount) {
        throw new Error(`Paystack plan "${name}" has amount ${plan.amount}, expected ${amount}. Fix or rename it in Paystack first.`);
      }
      if (!plan) plan = (await ps("/plan", { method: "POST", body: JSON.stringify({ name, interval, amount, currency: "NGN" }) })).data;
      rows.push({ id, tier, interval, price_kobo: amount, launch, paystack_plan_code: plan.plan_code, active: true });
      console.log(`${id.padEnd(28)} ${plan.plan_code}  ₦${amount / 100}`);
    }
  }
}

const res = await fetch(`${supaUrl}/rest/v1/billing_plans?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});
if (!res.ok) throw new Error(`billing_plans upsert failed: ${res.status} ${await res.text()}`);
console.log(`Upserted ${rows.length} billing_plans rows.`);
```

- [ ] **Step 6: Verify**

Run `npm run typecheck` and `npm test` — Expected: no new errors; PASS (existing shop webhook tests must still pass — billing dispatch only triggers for billing events).
With the user's Paystack **test** secret in `.env.local` and migration 019 run: `node --env-file=.env.local --experimental-strip-types --no-warnings scripts/paystack-plans.mjs` → prints 12 plan codes; running it again creates nothing new.

- [ ] **Step 7: Commit**

```bash
git add src/lib/billing/paystackBilling.server.ts src/lib/billing/webhook.server.ts src/app/api/billing/checkout/route.ts scripts/paystack-plans.mjs src/lib/shop/webhook.server.ts
git commit -m "Billing: Paystack plans script, checkout and subscription webhook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Owner Billing tab, trial banner, new-site button

**Files:**
- Create: `src/app/api/billing/[siteId]/route.ts`, `src/components/dashboard/BillingPanel.tsx`, `src/components/dashboard/TrialBanner.tsx`, `src/app/dashboard/[siteId]/billing/page.tsx`
- Modify: `src/lib/siteAccess.ts` (`DashboardTab`, `tabsForRole`), `src/components/dashboard/SiteShell.tsx` (`TAB_LABELS`, banner), `src/app/dashboard/page.tsx` (New site button), `tests/siteAccess.test.mjs`

**Interfaces:**
- Consumes: `requireSiteRole`, `rateLimit`, `supabaseService`; `loadSubscription` (Task 6); `isLive`, `daysLeft` (Task 2); `offeredPlans`, `formatNaira`, `PLAN_INFO`, `DOMAIN_ADDONS` (Task 1); `verifyTransaction`, `manageLink`, `disableSubscription` (Task 15); `settleFirstCharge` (Task 15); `parseBillingEvent`, `isBillingReference` (Task 4); `sendSalesEmail` (Task 6); `apiFetch`, `cardCls`, `Notice` (`src/components/shop-admin/common.tsx`).
- HTTP: `GET /api/billing/[siteId]?verify=<ref>` → `BillingView`; `POST /api/billing/[siteId] { action: "cancel" | "manage" | "domain", desiredName? }`.
- Produces: `BillingView = { subscription: {...} | null; live: boolean; trialDaysLeft: number; plans: OfferedPlan[]; events: Array<{ kind; amount_kobo; status; plan_id; created_at }>; domainRequests: Array<{ desired_name; status; renews_at }>; role }`.

- [ ] **Step 1: Update tab tests first**

In `tests/siteAccess.test.mjs` change the owner and admin expectations to end with `"billing"`:

```js
  assert.deepEqual(tabsForRole("owner"), ["overview", "content", "blog", "inbox", "business", "insights", "team", "billing"]);
  assert.deepEqual(tabsForRole("admin"), ["overview", "content", "blog", "inbox", "business", "insights", "team", "billing"]);
```

Run `npm test` — Expected: FAIL on `tabsForRole`. Also update any other `tabsForRole(...)` expectations in that file that list owner/admin tabs (search the file for `"team"]`) the same way.

- [ ] **Step 2: Add the tab**

In `src/lib/siteAccess.ts` change the type to

```ts
export type DashboardTab = "overview" | "content" | "blog" | "inbox" | "business" | "insights" | "team" | "shop" | "billing";
```

and the owner/admin default list to `["overview", "content", "blog", "inbox", "business", "insights", "team", "billing"]`. In `src/components/dashboard/SiteShell.tsx` add `billing: "Billing",` to `TAB_LABELS`. Run `npm test` — Expected: PASS.

- [ ] **Step 3: `src/app/api/billing/[siteId]/route.ts`**

```ts
import { NextResponse } from "next/server";

import { sendSalesEmail } from "@/lib/billing/email.server";
import { disableSubscription, manageLink, verifyTransaction } from "@/lib/billing/paystackBilling.server";
import { isBillingReference } from "@/lib/billing/reference";
import { daysLeft, isLive } from "@/lib/billing/subscriptionState";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { settleFirstCharge } from "@/lib/billing/webhook.server";
import { parseBillingEvent } from "@/lib/billing/webhookEvents";
import { offeredPlans } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner", "admin"]);
  if (!auth.ok) return auth.response;
  const db = supabaseService();

  // Back from Paystack: settle now instead of waiting for the webhook.
  const ref = new URL(req.url).searchParams.get("verify");
  if (ref && isBillingReference(ref)) {
    try {
      const tx = await verifyTransaction(ref);
      if (tx.status === "success") {
        const ev = parseBillingEvent({ event: "charge.success", data: tx });
        if (ev.kind === "first_charge") await settleFirstCharge(db, ev);
      }
    } catch (err) {
      console.error("[billing] verify failed", err instanceof Error ? err.message : "error");
    }
  }

  const sub = await loadSubscription(db, siteId);
  const [events, domains] = await Promise.all([
    db.from("billing_events").select("kind, amount_kobo, status, plan_id, created_at").eq("site_id", siteId).neq("status", "pending").order("created_at", { ascending: false }).limit(20),
    db.from("domain_requests").select("desired_name, status, renews_at").eq("site_id", siteId).order("created_at", { ascending: false }),
  ]);
  const now = Date.now();
  return json({
    subscription: sub && {
      status: sub.status, tier: sub.tier, interval: sub.interval, plan_id: sub.plan_id,
      trial_ends_at: sub.trial_ends_at, current_period_end: sub.current_period_end,
      grace_ends_at: sub.grace_ends_at, hasCard: !!sub.paystack_subscription_code,
    },
    live: sub ? isLive(sub, now) : true,
    trialDaysLeft: sub ? daysLeft(sub.trial_ends_at, now) : 0,
    plans: offeredPlans(new Date(now)),
    events: events.data ?? [],
    domainRequests: domains.data ?? [],
    role: auth.role,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`billing-action:${auth.userId}`, { limit: 20, windowMs: 10 * 60_000 });
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as { action?: string; desiredName?: string } | null;
  const db = supabaseService();
  const sub = await loadSubscription(db, siteId);

  if (body?.action === "domain") {
    const name = (body.desiredName ?? "").trim().toLowerCase();
    if (!DOMAIN_RE.test(name) || name.length > 100) return json({ error: "Enter a domain like yourbusiness.com.ng." }, 400);
    const { error } = await db.from("domain_requests").insert({ site_id: siteId, requested_by: auth.userId, desired_name: name });
    if (error) return json({ error: "Could not send your request." }, 500);
    await sendSalesEmail(`Domain add-on request: ${name}`, `Site: ${siteId}\nOwner: ${auth.email ?? auth.userId}\nDomain: ${name}`);
    return json({ ok: true });
  }

  if (!sub?.paystack_subscription_code) return json({ error: "There's no active card subscription on this site." }, 409);

  if (body?.action === "manage") {
    try {
      return json({ url: await manageLink(sub.paystack_subscription_code) });
    } catch {
      return json({ error: "Could not open card settings. Please try again." }, 502);
    }
  }

  if (body?.action === "cancel") {
    const { data: secret } = await db.from("billing_secrets").select("email_token").eq("site_id", siteId).maybeSingle();
    if (!secret?.email_token) return json({ error: "Could not cancel. Please contact Sulvatech." }, 500);
    try {
      await disableSubscription(sub.paystack_subscription_code, secret.email_token as string);
    } catch {
      return json({ error: "Could not reach Paystack. Please try again." }, 502);
    }
    await db.from("site_subscriptions").update({ status: "cancelling" }).eq("site_id", siteId);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}
```

Check: `requireSiteRole` returns `email` (it does: `{ ok, userId, role, email }`).

- [ ] **Step 4: `src/components/dashboard/BillingPanel.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";
import { DOMAIN_ADDONS, PLAN_INFO, TIERS, formatNaira, type Interval, type OfferedPlan, type Tier } from "@/lib/marketing/pricing";

type View = {
  subscription: {
    status: string; tier: Tier; interval: Interval; plan_id: string | null; trial_ends_at: string | null;
    current_period_end: string | null; grace_ends_at: string | null; hasCard: boolean;
  } | null;
  live: boolean;
  trialDaysLeft: number;
  plans: OfferedPlan[];
  events: Array<{ kind: string; amount_kobo: number | null; status: string; plan_id: string | null; created_at: string }>;
  domainRequests: Array<{ desired_name: string; status: string; renews_at: string | null }>;
  role: string;
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

function headline(v: View): { tone: "ok" | "warn" | "error" | "info"; text: string } {
  const s = v.subscription;
  if (!s || s.status === "manual") return { tone: "info", text: "This site is managed and billed by Sulvatech." };
  switch (s.status) {
    case "trialing": return { tone: "warn", text: `Free trial: ${v.trialDaysLeft} day${v.trialDaysLeft === 1 ? "" : "s"} left. Pick a plan to keep your site live.` };
    case "active": return { tone: "ok", text: `${PLAN_INFO[s.tier].name} plan · renews ${fmtDate(s.current_period_end)}` };
    case "past_due": return { tone: "error", text: `Your last payment failed. Update your card before ${fmtDate(s.grace_ends_at)} to avoid a pause.` };
    case "cancelling": return { tone: "warn", text: `Cancelled · your site stays live until ${fmtDate(s.current_period_end)}.` };
    case "paused": return { tone: "error", text: "Your site is paused. Pick a plan to bring it back instantly." };
    default: return { tone: "error", text: "Your site is archived. Pick a plan to restore it." };
  }
}

export default function BillingPanel({ siteId }: { siteId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("business");
  const [interval, setPeriod] = useState<Interval>("monthly");
  const [busy, setBusy] = useState(false);
  const [domain, setDomain] = useState("");

  const load = useCallback(async () => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    const r = await apiFetch<View>(`/api/billing/${siteId}${ref ? `?verify=${encodeURIComponent(ref)}` : ""}`);
    if (!r.ok) return setError(r.data.error ?? "Could not load billing.");
    setView(r.data);
    if (r.data.subscription) {
      setTier(r.data.subscription.tier);
      setPeriod(r.data.subscription.interval);
    }
    if (ref) window.history.replaceState(null, "", window.location.pathname);
  }, [siteId]);
  useEffect(() => { void load(); }, [load]);

  async function pay() {
    setBusy(true);
    setError(null);
    const r = await apiFetch<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ siteId, tier, interval }) });
    if (r.ok && r.data.url) window.location.href = r.data.url;
    else { setError(r.data.error ?? "Could not start checkout."); setBusy(false); }
  }

  async function action(name: "cancel" | "manage" | "domain") {
    if (name === "cancel" && !window.confirm("Cancel your subscription? Your site stays live until the end of the paid period.")) return;
    setBusy(true);
    setError(null);
    const r = await apiFetch<{ url?: string }>(`/api/billing/${siteId}`, { method: "POST", body: JSON.stringify({ action: name, desiredName: domain }) });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Something went wrong.");
    if (r.data.url) window.location.href = r.data.url;
    else { setDomain(""); void load(); }
  }

  if (!view) return error ? <Notice kind="error">{error}</Notice> : <p className="text-sm">Loading…</p>;
  const s = view.subscription;
  const h = headline(view);
  const managed = !s || s.status === "manual";
  const plan = view.plans.find((p) => p.tier === tier && p.interval === interval)!;
  const isOwner = view.role === "owner";

  return (
    <div className="space-y-4">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Notice kind={h.tone}>{h.text}</Notice>

      {!managed && isOwner ? (
        <div className={cardCls}>
          <p className="font-medium">{s && ["active", "cancelling"].includes(s.status) ? "Change plan" : "Keep my site live"}</p>
          <div className="mt-3 inline-flex rounded-full bg-koi-paper p-1 ring-1 ring-koi-ink/10">
            {(["monthly", "annually"] as const).map((i) => (
              <button key={i} type="button" onClick={() => setPeriod(i)} className={`rounded-full px-4 py-1.5 text-sm ${interval === i ? "bg-koi-ink text-white" : ""}`}>
                {i === "monthly" ? "Monthly" : "Yearly · 2 months free"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const p = view.plans.find((x) => x.tier === t && x.interval === interval)!;
              return (
                <button key={t} type="button" onClick={() => setTier(t)} className={`rounded-2xl p-4 text-left ring-2 ${tier === t ? "ring-koi-deep" : "ring-koi-ink/10"}`}>
                  <p className="font-medium">{PLAN_INFO[t].name}</p>
                  <p className="mt-1 text-lg font-semibold">{formatNaira(p.price)}<span className="text-sm font-normal">{interval === "monthly" ? "/mo" : "/yr"}</span></p>
                  {p.launch ? <p className="text-xs text-koi-ink/50 line-through">{formatNaira(p.standardPrice)}</p> : null}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={busy} onClick={pay} className="mt-4 rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-50">
            Pay {formatNaira(plan.price)} with card
          </button>
          <p className="mt-2 text-xs text-koi-ink/60">
            Secure payment by Paystack. Renews automatically; cancel any time. Unused trial or paid days are added before your new period starts.
          </p>
        </div>
      ) : null}

      {!managed && isOwner && s?.hasCard ? (
        <div className={`${cardCls} flex flex-wrap gap-3`}>
          <button type="button" disabled={busy} onClick={() => action("manage")} className="rounded-full px-4 py-2 text-sm ring-1 ring-koi-ink/15">Update card</button>
          {s.status !== "cancelling" ? (
            <button type="button" disabled={busy} onClick={() => action("cancel")} className="rounded-full px-4 py-2 text-sm text-koi-orange ring-1 ring-koi-orange/30">Cancel subscription</button>
          ) : null}
        </div>
      ) : null}

      {isOwner ? (
        <div className={cardCls}>
          <p className="font-medium">Domain add-on</p>
          <p className="mt-1 text-sm text-koi-ink/70">
            We buy and manage a domain for you: {DOMAIN_ADDONS.map((d) => `${d.tld} ${formatNaira(d.yearly)}/yr`).join(" · ")}. We'll confirm availability and send a payment link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbusiness.com.ng" className="min-w-0 flex-1 rounded-full px-4 py-2 text-sm ring-1 ring-koi-ink/15" />
            <button type="button" disabled={busy || !domain} onClick={() => action("domain")} className="rounded-full bg-koi-ink px-4 py-2 text-sm text-white disabled:opacity-50">Request</button>
          </div>
          {view.domainRequests.length ? (
            <ul className="mt-3 text-sm">
              {view.domainRequests.map((d) => <li key={d.desired_name}>{d.desired_name} · {d.status}{d.renews_at ? ` · renews ${fmtDate(d.renews_at)}` : ""}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {view.events.length ? (
        <div className={cardCls}>
          <p className="font-medium">Payment history</p>
          <ul className="mt-2 divide-y divide-koi-ink/5 text-sm">
            {view.events.map((e, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>{fmtDate(e.created_at)} · {e.kind.replace(/_/g, " ")}</span>
                <span>{e.amount_kobo ? formatNaira(e.amount_kobo / 100) : ""} {e.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: `src/app/dashboard/[siteId]/billing/page.tsx`**

```tsx
"use client";

import { useParams } from "next/navigation";

import BillingPanel from "@/components/dashboard/BillingPanel";

export default function SiteBillingPage() {
  const { siteId } = useParams<{ siteId: string }>();
  return <BillingPanel siteId={siteId} />;
}
```

Match the other tab pages: open `src/app/dashboard/[siteId]/team/page.tsx` and, if it wraps content in a role gate or heading component, wrap `BillingPanel` the same way (owners and admins only).

- [ ] **Step 6: `src/components/dashboard/TrialBanner.tsx` and wire it into `SiteShell`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/components/shop-admin/common";

type Mini = { subscription: { status: string } | null; trialDaysLeft: number };

/** Shown above the tabs for trial, past-due and paused sites. Owners only (the API 403s for staff). */
export default function TrialBanner({ siteId }: { siteId: string }) {
  const [v, setV] = useState<Mini | null>(null);
  useEffect(() => {
    void apiFetch<Mini>(`/api/billing/${siteId}`).then((r) => r.ok && setV(r.data));
  }, [siteId]);
  const s = v?.subscription?.status;
  if (!v || !s || !["trialing", "past_due", "paused", "archived"].includes(s)) return null;
  const text =
    s === "trialing" ? `${v.trialDaysLeft} day${v.trialDaysLeft === 1 ? "" : "s"} left in your free trial.`
      : s === "past_due" ? "Your last payment failed."
        : "Your site is paused.";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-koi-ink px-4 py-3 text-sm text-white">
      <span>{text}</span>
      <Link href={`/dashboard/${siteId}/billing`} className="rounded-full bg-white px-4 py-1.5 font-medium text-koi-ink">
        {s === "past_due" ? "Update card" : "Keep my site live"}
      </Link>
    </div>
  );
}
```

In `src/components/dashboard/SiteShell.tsx`, import `TrialBanner` and render `{value.role !== "staff" ? <TrialBanner siteId={siteId} /> : null}` directly above the `<Tabs` element (around line 160; `value.role` and `siteId` are in scope there).

- [ ] **Step 7: New site button**

In `src/app/dashboard/page.tsx` import `PillButton` from `@/components/ui/Button` (if not imported) and add directly after `<h1 className="sr-only">Your sites</h1>`:

```tsx
      <div className="flex justify-end">
        <PillButton href="/signup?add=1" size="sm" arrow={false}>New site</PillButton>
      </div>
```

- [ ] **Step 8: Verify**

`npm run typecheck`, `npm test` — PASS. In the browser as the trial owner from Task 14: dashboard shows the black trial banner; Billing tab shows "Free trial: 7 days left", plan cards with launch prices, "Pay ₦7,000 with card". Staff users don't see the Billing tab. An existing (manual) site shows "managed and billed by Sulvatech". Domain request submits and appears in the list. (Payment itself is verified in Task 19.)

- [ ] **Step 9: Commit**

```bash
git add "src/app/api/billing/[siteId]/route.ts" src/components/dashboard/BillingPanel.tsx src/components/dashboard/TrialBanner.tsx "src/app/dashboard/[siteId]/billing/page.tsx" src/lib/siteAccess.ts src/components/dashboard/SiteShell.tsx src/app/dashboard/page.tsx tests/siteAccess.test.mjs
git commit -m "Owner billing tab, trial banner and new-site button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Daily billing cron

**Files:**
- Create: `src/app/api/cron/billing/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `sweepStatus`, `DAY_MS` (Task 2); `emailsDue` (Task 6); `SUB_COLUMNS`, `SubscriptionRow` (Task 6); `sendLifecycleEmail`, `sendSalesEmail` (Task 6); `supabaseService`.
- HTTP: `GET /api/cron/billing` with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically when `CRON_SECRET` is set) → `{ swept, emailed, domainReminders }`.

- [ ] **Step 1: `src/app/api/cron/billing/route.ts`**

```ts
import { NextResponse } from "next/server";

import { sendLifecycleEmail, sendSalesEmail } from "@/lib/billing/email.server";
import { emailsDue } from "@/lib/billing/lifecycle";
import { DAY_MS, sweepStatus } from "@/lib/billing/subscriptionState";
import { SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { supabaseService } from "@/lib/supabase/admin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseService();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data, error } = await db
    .from("site_subscriptions")
    .select(SUB_COLUMNS)
    .in("status", ["trialing", "past_due", "cancelling", "paused"])
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let swept = 0;
  let emailed = 0;
  for (const row of (data ?? []) as SubscriptionRow[]) {
    let sub = row;
    const next = sweepStatus(sub, now);
    if (next) {
      const patch = next === "paused" ? { status: next, paused_at: nowIso } : { status: next };
      // Conditional on the old status so a webhook that landed meanwhile wins.
      const { data: updated, error: upErr } = await db
        .from("site_subscriptions")
        .update(patch)
        .eq("site_id", sub.site_id)
        .eq("status", sub.status)
        .select("site_id");
      if (upErr || !updated?.length) continue;
      if (next === "archived") await db.from("sites").update({ status: "suspended" }).eq("id", sub.site_id);
      sub = { ...sub, ...patch } as SubscriptionRow;
      swept++;
    }
    for (const key of emailsDue(sub, now)) {
      if (await sendLifecycleEmail(db, sub.site_id, key)) emailed++;
    }
  }

  const soon = new Date(now + 30 * DAY_MS).toISOString().slice(0, 10);
  const { data: domains } = await db
    .from("domain_requests")
    .select("id, site_id, desired_name, renews_at")
    .eq("status", "active")
    .lte("renews_at", soon)
    .is("renewal_reminded_at", null);
  let domainReminders = 0;
  for (const d of domains ?? []) {
    const sent = await sendSalesEmail(
      `Domain renewal due: ${d.desired_name}`,
      `${d.desired_name} renews on ${d.renews_at}.\nSend the owner a payment link, renew it, then set the new renewal date in Admin → Billing.\nSite: ${d.site_id}`,
    );
    if (sent) {
      await db.from("domain_requests").update({ renewal_reminded_at: nowIso }).eq("id", d.id);
      domainReminders++;
    }
  }

  return NextResponse.json({ swept, emailed, domainReminders });
}
```

- [ ] **Step 2: `vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "crons": [{ "path": "/api/cron/billing", "schedule": "0 7 * * *" }]
}
```

(07:00 UTC = 08:00 Lagos.)

- [ ] **Step 3: Verify**

`npm run typecheck`. With the dev server running and `CRON_SECRET=devsecret` in `.env.local`:
- `curl -s http://localhost:3000/api/cron/billing` → `401`.
- In Supabase set the test trial site's `trial_ends_at` to yesterday, then `curl -s -H "Authorization: Bearer devsecret" http://localhost:3000/api/cron/billing` → `{"swept":1,...}`; the row is `paused` with `paused_at`; `/<slug>` now shows "taking a short break"; the owner's dashboard banner says "Your site is paused." Re-running sweeps 0 and sends no duplicate email (`emails_sent` contains `paused:<date>`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/billing/route.ts vercel.json
git commit -m "Daily billing cron: pause, archive, lifecycle and renewal emails

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Admin billing overview

**Files:**
- Create: `src/app/api/admin/billing/route.ts`, `src/app/admin/billing/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin(req, { superOnly: true })`, `supabaseService`; `SUB_COLUMNS`, `SubscriptionRow` (Task 6); `monthlyEquivalentKobo`, `isTier`, `formatNaira`, `PLAN_INFO` (Task 1); `DAY_MS` (Task 2); `apiFetch`, `cardCls`, `Notice`.
- HTTP: `GET /api/admin/billing` → `{ rows, mrrKobo, domainRequests }`; `POST /api/admin/billing { action, siteId?, tier?, days?, id?, status?, renews_at?, notes? }` with actions `set_tier`, `set_manual`, `extend_trial`, `allow`, `block`, `unblock`, `domain`.

- [ ] **Step 1: `src/app/api/admin/billing/route.ts`**

```ts
import { NextResponse } from "next/server";

import { DAY_MS } from "@/lib/billing/subscriptionState";
import { SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { isTier, monthlyEquivalentKobo, type Interval } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DOMAIN_STATUSES = ["requested", "quoted", "paid", "active", "rejected"];

export async function GET(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const db = supabaseService();
  const [subs, sites, profiles, plans, domains] = await Promise.all([
    db.from("site_subscriptions").select(SUB_COLUMNS).neq("status", "manual").order("created_at", { ascending: false }).limit(2000),
    db.from("sites").select("id, slug"),
    db.from("business_profiles").select("site_id, business_name"),
    db.from("billing_plans").select("id, price_kobo, interval"),
    db.from("domain_requests").select("*").neq("status", "rejected").order("created_at", { ascending: false }),
  ]);
  if (subs.error) return json({ error: subs.error.message }, 500);
  const slugBy = new Map((sites.data ?? []).map((s) => [s.id as string, s.slug as string]));
  const nameBy = new Map((profiles.data ?? []).map((p) => [p.site_id as string, p.business_name as string]));
  const planBy = new Map((plans.data ?? []).map((p) => [p.id as string, p]));
  let mrrKobo = 0;
  const rows = ((subs.data ?? []) as SubscriptionRow[]).map((s) => {
    const plan = s.plan_id ? planBy.get(s.plan_id) : undefined;
    if (plan && ["active", "past_due", "cancelling"].includes(s.status)) {
      mrrKobo += monthlyEquivalentKobo(Number(plan.price_kobo), plan.interval as Interval);
    }
    return { ...s, slug: slugBy.get(s.site_id) ?? null, business_name: nameBy.get(s.site_id) ?? null };
  });
  return json({ rows, mrrKobo, domainRequests: domains.data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.action !== "string") return json({ error: "Missing action." }, 400);
  const db = supabaseService();

  if (b.action === "domain") {
    if (typeof b.id !== "string") return json({ error: "Missing id." }, 400);
    const patch: Record<string, unknown> = {};
    if (typeof b.status === "string") {
      if (!DOMAIN_STATUSES.includes(b.status)) return json({ error: "Bad status." }, 400);
      patch.status = b.status;
    }
    if (typeof b.renews_at === "string") {
      patch.renews_at = b.renews_at || null;
      patch.renewal_reminded_at = null;
    }
    if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 2000);
    const { error } = await db.from("domain_requests").update(patch).eq("id", b.id);
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  const siteId = typeof b.siteId === "string" ? b.siteId : "";
  if (!siteId) return json({ error: "Missing siteId." }, 400);
  const { data: current } = await db.from("site_subscriptions").select("status, trial_ends_at").eq("site_id", siteId).maybeSingle();
  const restore = async () => {
    if (current?.status === "archived") await db.from("sites").update({ status: "published" }).eq("id", siteId).eq("status", "suspended");
  };

  let patch: Record<string, unknown>;
  switch (b.action) {
    case "set_tier":
      if (!isTier(b.tier)) return json({ error: "Bad tier." }, 400);
      patch = { tier: b.tier };
      break;
    case "set_manual":
      patch = { status: "manual", blocked: false, paused_at: null };
      break;
    case "extend_trial": {
      const days = Number(b.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return json({ error: "Days must be 1–30." }, 400);
      if (current && !["trialing", "paused", "archived"].includes(current.status as string)) {
        return json({ error: "Only trial, paused or archived sites can get trial days." }, 409);
      }
      const base = Math.max(Date.now(), current?.trial_ends_at ? Date.parse(current.trial_ends_at as string) : 0);
      patch = { status: "trialing", trial_ends_at: new Date(base + days * DAY_MS).toISOString(), paused_at: null };
      break;
    }
    case "allow":
      patch = { flagged: null };
      break;
    case "block":
      patch = { blocked: true };
      break;
    case "unblock":
      patch = { blocked: false };
      break;
    default:
      return json({ error: "Unknown action." }, 400);
  }

  const { error } = current
    ? await db.from("site_subscriptions").update(patch).eq("site_id", siteId)
    : await db.from("site_subscriptions").insert({ site_id: siteId, status: "manual", ...patch });
  if (error) return json({ error: error.code === "23505" ? "This owner already has a site on trial." : error.message }, error.code === "23505" ? 409 : 500);
  if (b.action === "set_manual" || b.action === "extend_trial") await restore();
  return json({ ok: true });
}
```

- [ ] **Step 2: `src/app/admin/billing/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";
import { PLAN_INFO, TIERS, formatNaira, type Tier } from "@/lib/marketing/pricing";

type Row = {
  site_id: string; slug: string | null; business_name: string | null; tier: Tier; interval: string; status: string;
  trial_ends_at: string | null; current_period_end: string | null; flagged: string | null; blocked: boolean; created_at: string;
};
type Domain = { id: string; site_id: string; desired_name: string; status: string; renews_at: string | null; notes: string | null };
type Data = { rows: Row[]; mrrKobo: number; domainRequests: Domain[] };

const ORDER = ["past_due", "trialing", "paused", "cancelling", "active", "archived"];
const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export default function AdminBillingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<Data>("/api/admin/billing");
    if (r.ok) setData(r.data);
    else setError(r.data.error ?? "Could not load billing.");
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(body: Record<string, unknown>) {
    setError(null);
    const r = await apiFetch("/api/admin/billing", { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) setError(r.data.error ?? "Action failed.");
    void load();
  }

  const soon = Date.now() + 2 * 86_400_000;
  const groups = useMemo(() => {
    const rows = data?.rows ?? [];
    return ORDER.map((status) => ({ status, rows: rows.filter((r) => r.status === status) })).filter((g) => g.rows.length);
  }, [data]);
  const flagged = data?.rows.filter((r) => r.flagged) ?? [];
  const endingSoon = data?.rows.filter((r) => r.status === "trialing" && r.trial_ends_at && Date.parse(r.trial_ends_at) < soon) ?? [];

  if (!data) return <div className="p-4">{error ? <Notice kind="error">{error}</Notice> : "Loading…"}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm">MRR <span className="text-xl font-semibold">{formatNaira(data.mrrKobo / 100)}</span></p>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}

      {flagged.length ? (
        <section className={cardCls}>
          <h2 className="font-medium">Flagged signups</h2>
          {flagged.map((r) => (
            <div key={r.site_id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{r.business_name ?? r.slug} · {r.flagged}{r.blocked ? " · BLOCKED" : ""}</span>
              <span className="flex gap-2">
                <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => act({ action: "allow", siteId: r.site_id })}>Allow</button>
                <button className="rounded-full px-3 py-1 text-koi-orange ring-1 ring-koi-orange/30" onClick={() => act({ action: r.blocked ? "unblock" : "block", siteId: r.site_id })}>{r.blocked ? "Unblock" : "Block"}</button>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {endingSoon.length ? <Notice kind="warn">{endingSoon.length} trial(s) end within 48h: {endingSoon.map((r) => r.business_name ?? r.slug).join(", ")}</Notice> : null}

      {groups.map((g) => (
        <section key={g.status} className={cardCls}>
          <h2 className="font-medium capitalize">{g.status.replace("_", " ")} ({g.rows.length})</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.site_id} className="border-t border-koi-ink/5">
                    <td className="py-2">
                      <a href={`/admin/sites/${r.site_id}`} className="font-medium">{r.business_name ?? r.slug}</a>
                      <span className="block text-xs text-koi-ink/50">{r.slug}</span>
                    </td>
                    <td>
                      <select value={r.tier} onChange={(e) => act({ action: "set_tier", siteId: r.site_id, tier: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10">
                        {TIERS.map((t) => <option key={t} value={t}>{PLAN_INFO[t].name}</option>)}
                      </select>
                    </td>
                    <td>{r.interval}</td>
                    <td>{r.status === "trialing" ? `trial ends ${d(r.trial_ends_at)}` : `period ends ${d(r.current_period_end)}`}</td>
                    <td className="space-x-2 text-right">
                      <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => {
                        const days = Number(window.prompt("Extend trial by how many days (1–30)?", "7"));
                        if (days) void act({ action: "extend_trial", siteId: r.site_id, days });
                      }}>+ trial</button>
                      <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => window.confirm("Mark as manual (billed by Sulvatech, no limits)?") && act({ action: "set_manual", siteId: r.site_id })}>Manual</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className={cardCls}>
        <h2 className="font-medium">Domain requests</h2>
        {data.domainRequests.length === 0 ? <p className="mt-2 text-sm text-koi-ink/60">None.</p> : null}
        {data.domainRequests.map((dr) => (
          <div key={dr.id} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{dr.desired_name}</span>
            <select value={dr.status} onChange={(e) => act({ action: "domain", id: dr.id, status: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10">
              {["requested", "quoted", "paid", "active", "rejected"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1">renews
              <input type="date" defaultValue={dr.renews_at ?? ""} onBlur={(e) => e.target.value !== (dr.renews_at ?? "") && act({ action: "domain", id: dr.id, renews_at: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10" />
            </label>
          </div>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

`npm run typecheck`, `npm test`. In the browser as a super admin: `/admin/billing` lists the test trial site under "trialing", the flagged one under "Flagged signups"; "+ trial" with 3 days moves `trial_ends_at`; Block makes `/<slug>` show the paused page; Unblock restores it; domain request status and renewal date save. Non-super admins get 403 from the API.

```bash
git add src/app/api/admin/billing/route.ts src/app/admin/billing/page.tsx
git commit -m "Admin billing overview: MRR, flagged signups, trials, domains

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Paystack test-mode end-to-end and README

**Files:**
- Modify: `README.md` (new "Public site, trials and billing" section)

- [ ] **Step 1: README section**

Append to `README.md`:

```markdown
## Public site, trials and billing

Spec: `docs/superpowers/specs/2026-10-08-public-site-pricing-design.md`.

**Prices** live in `src/lib/marketing/pricing.ts` (naira). Change them there, then re-run the plan script.

**Setup (once per environment)**
1. Run `supabase/migrations/019_billing.sql` in the Supabase SQL editor.
2. Supabase → Authentication → Email Templates → Confirm signup: add `Your code: {{ .Token }}`.
3. Env vars: `CRON_SECRET`, `SIGNUP_SECRET` (any long random strings), `SALES_NOTIFY_EMAIL`, optional `NEXT_PUBLIC_SALES_WHATSAPP` (digits, e.g. 2348012345678). Existing: `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM`.
4. Create Paystack plans: `node --env-file=.env.local --experimental-strip-types --no-warnings scripts/paystack-plans.mjs`.
   Plan codes differ between test and live mode: run it again with the live key when going live.
5. Paystack dashboard → Settings → API Keys & Webhooks: webhook URL `https://<platform domain>/api/paystack/webhook` (shared by shop and billing).

**Going live checklist:** Terms and refund policy pages exist (Paystack asks during activation), live key set, plan script re-run with the live key, test-mode end-to-end passed.
```

- [ ] **Step 2: End-to-end on a Vercel preview with Paystack test keys (user present)**

Paystack cannot reach `localhost`, so webhook steps run on a preview deployment with test keys; the callback verify path also works locally. Use Paystack's published test card from their docs (test mode only). Walk through with the user and tick each:

1. Signup on the preview → trial site live with badge.
2. Billing tab → Business monthly → Paystack test checkout → back on `/dashboard/<id>/billing?ref=…` → banner says "Business plan · renews <date ≈ trial end + 1 month>"; badge gone from the site; `billing_events` has the checkout row `paid`; `site_subscriptions.paystack_subscription_code` set.
3. Paystack dashboard → the subscription exists with next payment date = that renewal date.
4. "Update card" opens Paystack's manage page.
5. Cancel → status `cancelling`; Paystack shows the subscription disabled; webhook `subscription.disable` recorded as event `disable:SUB_…`; site stays live.
6. Set `current_period_end` to yesterday in Supabase, call the cron with the secret → `paused`; site shows the paused page; pay again → live immediately.
7. Commerce trial site: storefront shows WhatsApp ordering only; `POST /api/shop/<id>/checkout` returns 403 "Card payments start once…".
8. Re-deliver a webhook from the Paystack dashboard → response `already`, no duplicate change.

Record results in the PR description. Any failure → fix under superpowers:systematic-debugging before continuing.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "README: public site, trials and billing setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage check

| Spec item | Task |
| --- | --- |
| Pricing table, launch ÷3, annual, setup, real end date, lock-in | 1, 11, 15 (launch plans persist per subscription) |
| Plan features + gates (domain, badge, business data, AI, staff, shop) | 1, 2, 7, 8, 16 (UI) — custom-domain gate: see note below |
| `/`, `/templates`, `/templates/[key]`, `/pricing`, `/start`, `/signup` | 9, 10, 11, 12, 14 |
| Leads + admin leads | 12 |
| Reserved slugs (TS + DB) | 1, 5 |
| Sitemap / robots / metadata | 9 |
| Wizard (4 steps + build), OTP, sessionStorage | 14 |
| Build API, AI with sample fallback, publish, owner, subscription | 13 |
| Trial rules (badge, WhatsApp-only, one trial) | 5, 7, 13 |
| Abuse limits (email norm, disposable, phone, device, soft signals, admin allow/block, rate limits) | 3, 13, 18 |
| One unpaid site per account, no trial for second sites | 3, 13, 16 |
| Lifecycle (day 0/5/7/28/37) + cron | 6, 13, 17 |
| Paystack plans, checkout, start date keeps unused days, webhook dispatch, idempotency, statuses | 4, 15 |
| Owner Billing tab (plan change, card update, cancel, history, domain request) | 16 |
| Done-for-you manual billing | 18 (set_manual) |
| Domain add-on requests + renewal reminders | 16, 17, 18 |
| Admin billing (MRR, trials ending, past due, flagged, domains, per-site tier/manual/extend/unpause) | 18 |
| Migration 019, backfill manual, RLS | 5 |
| Tests + Paystack test-mode E2E | every task, 19 |

**Note — custom-domain gate:** domains are added by Sulvatech admins only, and the admin domain routes (`src/app/api/admin/sites/[siteId]/domains/`, `DomainsSection.tsx`) are the user's uncommitted work in progress. Once that work is committed, add to its POST handler: load the subscription with `loadSubscription(supabaseService(), siteId)` and, when `featuresForSite(sub)?.customDomain === false`, return `403 { error: "This site's plan doesn't include a custom domain. Upgrade it to Business first." }`. Ask the user before touching those files.
