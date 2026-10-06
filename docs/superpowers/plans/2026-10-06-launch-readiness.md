# Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps found in the 2026-10-06 audit so Sulva Sites can take paying clients: reliable AI, password recovery, archive/delete, page history, sitemaps, automatic custom domains, CI, an error log and an admin overview.

**Architecture:** Each task is independent and ships on its own. Pure logic lives in small `src/lib/*.ts` modules that are unit-tested by the Node built-in runner; Next.js route handlers and React components are thin wrappers around them. Database changes are idempotent numbered migrations (`017`–`019`) run in the Supabase SQL editor.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (Postgres, Auth, Storage), Tailwind 4 (koi tokens), Node test runner (`node --test`, `--experimental-strip-types`), Vercel REST API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-06-launch-readiness-design.md`

## Global Constraints

- Modules loaded by tests MUST use relative `.ts` imports (e.g. `./groq.server.ts`), never `@/…` (the Node runner cannot resolve `@/`).
- Source files are CRLF. Edit with the Edit tool or Node scripts, not multi-line `sed`/`perl`.
- No new npm dependencies.
- Migrations: idempotent (`if not exists`, `drop … if exists`, `create or replace`), numbered after `016`, and listed in README setup step 3.
- Service-role tables: RLS on, `revoke all … from anon, authenticated`, `grant … to service_role`.
- Admin-only server routes use `requireSiteRole(req, siteId, ["admin"])` (per site) or `requireAdmin(req, { superOnly })` (cross-site).
- Never log or store request bodies, headers, tokens or query strings in the error log.
- Commit after each task. Message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verify after each task: `npm test`, `npm run lint`, `npm run typecheck` (delete `.next/types` first if it reports the stale `api/ai/generate-site/route.js` error).

---

### Task 1: AI provider cooldown

Stops the AI chain from re-trying a provider that just returned 429/timeout, so requests go straight to one that can answer.

**Files:**
- Create: `src/lib/ai/providerHealth.ts`
- Modify: `src/lib/ai/llm.server.ts` (`aiChatWithInfo`)
- Modify: `tests/aiGemini.test.mjs`, `tests/aiOpenRouter.test.mjs` (reset state between tests)
- Test: `tests/aiProviderHealth.test.mjs`

**Interfaces:**
- Produces:
  - `type HealthProvider = "gemini" | "openrouter" | "groq"`
  - `cooldownMsFor(err: unknown): number`
  - `noteFailure(p: HealthProvider, err: unknown, now?: number): void`
  - `noteSuccess(p: HealthProvider): void`
  - `isCooling(p: HealthProvider, now?: number): boolean`
  - `resetProviderHealth(): void`

- [ ] **Step 1: Write the failing test** — `tests/aiProviderHealth.test.mjs`

```js
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import { GroqError } from "../src/lib/ai/groq.server.ts";
import { aiChatWithInfo } from "../src/lib/ai/llm.server.ts";
import {
  cooldownMsFor,
  isCooling,
  noteFailure,
  noteSuccess,
  resetProviderHealth,
} from "../src/lib/ai/providerHealth.ts";

beforeEach(() => resetProviderHealth());

const openai = (text) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const tooMany = () => new Response("quota", { status: 429 });

function harness(env, ...answers) {
  const urls = [];
  return {
    urls,
    deps: {
      env,
      sleep: async () => {},
      fetch: async (url) => {
        urls.push(String(url));
        return answers.shift() ?? openai("default");
      },
    },
  };
}

test("cooldown: rate limits wait the advertised time, capped at 5 minutes", () => {
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429, "Please try again in 12.5s")), 12500);
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429)), 30000);
  assert.equal(cooldownMsFor(new GroqError("rate_limited", "x", 429, "try again in 9999s")), 300000);
});

test("cooldown: timeouts, server errors and network errors cool for 10s; bad requests do not", () => {
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 408)), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 503)), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 0)), 10000);
  assert.equal(cooldownMsFor(new TypeError("fetch failed")), 10000);
  assert.equal(cooldownMsFor(new GroqError("upstream", "x", 400)), 0);
  assert.equal(cooldownMsFor(new GroqError("bad_key", "x", 401)), 0);
  assert.equal(cooldownMsFor(new GroqError("empty", "x", 200)), 0);
});

test("noteFailure / isCooling / noteSuccess", () => {
  noteFailure("gemini", new GroqError("rate_limited", "x", 429), 1000);
  assert.equal(isCooling("gemini", 1000 + 29999), true);
  assert.equal(isCooling("gemini", 1000 + 30000), false);
  noteSuccess("gemini");
  assert.equal(isCooling("gemini", 1001), false);
  assert.equal(isCooling("groq", 1001), false);
});

test("a provider that just hit its quota is skipped on the next request", async () => {
  const env = { GEMINI_API_KEY: "g", GROQ_API_KEY: "q" };
  const first = harness(env, tooMany(), openai("from groq"));
  assert.equal((await aiChatWithInfo({ user: "hi" }, first.deps)).provider, "groq");
  assert.match(first.urls[0], /generativelanguage/);

  const second = harness(env, openai("groq again"));
  const r = await aiChatWithInfo({ user: "hi" }, second.deps);
  assert.equal(r.provider, "groq");
  assert.equal(second.urls.length, 1);
  assert.match(second.urls[0], /api\.groq\.com/);
});

test("when every provider is cooling, they are all tried anyway", async () => {
  const env = { GEMINI_API_KEY: "g" };
  noteFailure("gemini", new GroqError("rate_limited", "x", 429));
  const h = harness(env, new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 }));
  const r = await aiChatWithInfo({ user: "hi" }, h.deps);
  assert.equal(r.text, "ok");
  assert.equal(isCooling("gemini"), false);
});

test("Groq failures are recorded too", async () => {
  const env = { GROQ_API_KEY: "q" };
  const h = harness(env, tooMany(), tooMany(), tooMany(), tooMany());
  await assert.rejects(aiChatWithInfo({ user: "hi" }, h.deps));
  assert.equal(isCooling("groq"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --no-warnings --test tests/aiProviderHealth.test.mjs`
Expected: FAIL — `Cannot find module '…/src/lib/ai/providerHealth.ts'`

- [ ] **Step 3: Write `src/lib/ai/providerHealth.ts`**

```ts
// Short "cooling down" memory per AI provider. A provider that just ran out of quota or timed out is
// skipped by llm.server.ts for a little while, so requests go straight to one that can answer instead
// of paying a full timeout first. In-memory and per server instance: it only saves wasted calls.
// Relative imports only (Node test runner).
import { GroqError } from "./groq.server.ts";

export type HealthProvider = "gemini" | "openrouter" | "groq";

const RATE_LIMIT_DEFAULT_MS = 30_000;
const RATE_LIMIT_MAX_MS = 300_000;
const FAILURE_MS = 10_000;

const coolingUntil = new Map<HealthProvider, number>();

/** How long to rest a provider after this error. 0 for errors a rest will not fix (bad key, bad request). */
export function cooldownMsFor(err: unknown): number {
  if (!(err instanceof GroqError)) return FAILURE_MS;
  if (err.code === "rate_limited") {
    const wait = Number(err.detail?.match(/try again in ([\d.]+)s/i)?.[1]);
    return Number.isFinite(wait) && wait > 0 ? Math.min(Math.round(wait * 1000), RATE_LIMIT_MAX_MS) : RATE_LIMIT_DEFAULT_MS;
  }
  if (err.code === "upstream" && (err.status === 0 || err.status === 408 || err.status >= 500)) return FAILURE_MS;
  return 0;
}

export function noteFailure(p: HealthProvider, err: unknown, now: number = Date.now()): void {
  const ms = cooldownMsFor(err);
  if (ms > 0) coolingUntil.set(p, Math.max(coolingUntil.get(p) ?? 0, now + ms));
}

export function noteSuccess(p: HealthProvider): void {
  coolingUntil.delete(p);
}

export function isCooling(p: HealthProvider, now: number = Date.now()): boolean {
  return (coolingUntil.get(p) ?? 0) > now;
}

/** Tests only. */
export function resetProviderHealth(): void {
  coolingUntil.clear();
}
```

- [ ] **Step 4: Use it in `src/lib/ai/llm.server.ts`**

Add the import below the existing imports:

```ts
import { isCooling, noteFailure, noteSuccess } from "./providerHealth.ts";
```

Replace the whole `aiChatWithInfo` function with:

```ts
export async function aiChatWithInfo(opts: GroqChatOptions, deps: GroqDeps = {}): Promise<AiChatResult> {
  const env = deps.env ?? process.env;
  const configured = timedSteps(env, false);
  const groqKey = Boolean(env.GROQ_API_KEY);
  if (!configured.length && !groqKey) {
    throw new GroqError(
      "not_configured",
      "AI is not configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY in the server environment variables.",
    );
  }

  // A provider that just failed rests for a moment, unless every provider is resting.
  const now = Date.now();
  const names: AiProvider[] = [...configured.map((s) => s.provider), ...(groqKey ? (["groq"] as const) : [])];
  const anyReady = names.some((p) => !isCooling(p, now));
  const steps = anyReady ? configured.filter((s) => !isCooling(s.provider, now)) : configured;
  const groq = groqKey && (!anyReady || !isCooling("groq", now));

  const budget = opts.timeoutMs && opts.timeoutMs > 0 ? opts.timeoutMs : Number(env.OPENROUTER_TIMEOUT_MS) > 0 ? Number(env.OPENROUTER_TIMEOUT_MS) : OPENROUTER_TIMEOUT_MS;
  const deadline = Date.now() + budget;
  let lastError: unknown = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const isLast = i === steps.length - 1 && !groq;
    const left = deadline - Date.now();
    // A later provider is skipped when an earlier one used up the budget, unless nothing comes after it.
    if (i > 0 && left < MIN_CALL_MS && !isLast) continue;
    const timeoutMs = i === 0 ? step.cap(left) : Math.max(step.cap(left), MIN_CALL_MS);
    try {
      const text = await step.run({ ...opts, timeoutMs }, deps);
      noteSuccess(step.provider);
      return { text, provider: step.provider, model: step.model };
    } catch (e) {
      noteFailure(step.provider, e);
      if (isLast) throw e;
      lastError = e;
      console.error(`${step.provider} failed (${describe(e)}); trying the next AI provider.`);
    }
  }
  if (!groq) throw lastError ?? new GroqError("upstream", "AI request failed.");
  try {
    const text = await groqChat(opts, deps);
    noteSuccess("groq");
    return { text, provider: "groq", model: env.GROQ_MODEL || "groq default" };
  } catch (e) {
    noteFailure("groq", e);
    throw e;
  }
}
```

Also update the doc comment above it: append the sentence `A provider that failed in the last few seconds (quota, timeout, outage) is skipped while another can answer; see providerHealth.ts.`

- [ ] **Step 5: Reset state in the existing AI test files**

In `tests/aiGemini.test.mjs` and `tests/aiOpenRouter.test.mjs`: change `import { test } from "node:test";` to `import { beforeEach, test } from "node:test";`, add `import { resetProviderHealth } from "../src/lib/ai/providerHealth.ts";` with the other imports, and add directly after the imports:

```js
beforeEach(() => resetProviderHealth());
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: all pass, including the 6 new ones.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/providerHealth.ts src/lib/ai/llm.server.ts tests/aiProviderHealth.test.mjs tests/aiGemini.test.mjs tests/aiOpenRouter.test.mjs
git commit -m "AI: skip a provider for a moment after it runs out of quota or times out"
```

---

### Task 2: Eval pacing and production AI docs

**Files:**
- Modify: `tests/eval/runAssistantEval.mjs`
- Modify: `README.md` (Setup env block, Scripts table, new "Production AI" section)

**Interfaces:**
- Consumes: `resetProviderHealth` is NOT used here (the eval should see real cooldown behaviour).

- [ ] **Step 1: Add `--delay` to the eval runner**

In `tests/eval/runAssistantEval.mjs`, after the `const only = …` line, add:

```js
const delayArg = args.find((a) => a.startsWith("--delay="));
// Free tiers allow only a few requests per minute; pace the run unless told otherwise.
const DELAY_MS = delayArg ? Math.max(0, Number(delayArg.slice("--delay=".length)) || 0) : 4000;
```

Change the filter on the `only` line so flags with values are ignored: `const only = args.filter((a) => !a.startsWith("--"));` stays as is (it already ignores `--delay=…`).

Inside the `for (const c of cases)` loop, as its first statement, add:

```js
  if (rows.length && DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
```

Update the header comment line 3 to: `// Run against the live models with \`npm run eval:assistant\` (loads keys from .env.local). \`-- --delay=0\` turns pacing off.`

- [ ] **Step 2: Load `.env.local` automatically**

In `package.json` change the `eval:assistant` script to:

```json
"eval:assistant": "node --env-file-if-exists=.env.local --experimental-strip-types --no-warnings tests/eval/runAssistantEval.mjs"
```

- [ ] **Step 3: README**

In the Scripts table row for `npm run eval:assistant`, replace the description with:
`Runs the 20 real-style "Ask AI" requests in tests/eval/ against the live models (keys from .env.local; one model call each, 4s apart — \`-- --delay=0\` to go faster on paid keys). \`-- --gemini\`, \`-- --openrouter\` or \`-- --groq\` scores one provider alone. Run it before launch and after any model change; it fails below 85%.`

Add a section after "## Scripts":

```markdown
## Production AI

Free tiers are fine for building sites, but they cannot carry several owners using "Ask AI" at once
(2026-10-06 eval on free keys: Gemini 408/429 on every call, Groq out of quota after 3).
Before onboarding clients set **one paid key** — either is enough:

- `GEMINI_API_KEY` from a Google AI Studio project with billing on (Tier 1). Keep `GEMINI_MODEL` unset.
- `OPENROUTER_API_KEY` with credit, and `OPENROUTER_MODEL` without the `:free` suffix.

Keep the free keys of the other providers set as fallbacks. A provider that runs out of quota or times out is
skipped for up to a few minutes (`src/lib/ai/providerHealth.ts`). Then run `npm run eval:assistant`; it must
pass (≥ 85%) against the production keys.
```

- [ ] **Step 4: Verify**

Run: `npm run eval:assistant -- phone hours`
Expected: two cases run about 4s apart and print PASS/FAIL lines (result depends on keys; the run itself must not crash).

- [ ] **Step 5: Commit**

```bash
git add tests/eval/runAssistantEval.mjs package.json README.md
git commit -m "AI eval: pace requests, load .env.local; README: production AI keys"
```

---

### Task 3: Forgot password

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Modify: `src/app/login/page.tsx` (link under the form)
- Modify: `src/lib/hostRouting.ts` (`isBypassPath`)
- Modify: `README.md` (Setup: Supabase Auth SMTP + redirect URL)
- Test: `tests/hostRouting.test.mjs`

**Interfaces:**
- Consumes: existing `/change-password` page (signed-in session → new password → clears `must_change_password`).

- [ ] **Step 1: Failing test** — append to `tests/hostRouting.test.mjs`:

```js
test("forgot-password is served by the app on every host, like login", () => {
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/forgot-password", "soothecontrols.site"), null);
  assert.equal(rewritePathForHost("client.com", "/forgot-password", "soothecontrols.site"), null);
});
```

(If `rewritePathForHost` is not yet imported in that file, add it to the existing import from `../src/lib/hostRouting.ts`.)

- [ ] **Step 2: Run** `node --experimental-strip-types --no-warnings --test tests/hostRouting.test.mjs` — Expected: FAIL (`'/bakery/forgot-password' !== null`).

- [ ] **Step 3: `src/lib/hostRouting.ts`** — in `isBypassPath`, after the `pathname.startsWith("/change-password") ||` line add:

```ts
    pathname.startsWith("/forgot-password") ||
```

- [ ] **Step 4: Run the test again** — Expected: PASS.

- [ ] **Step 5: Create `src/app/forgot-password/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { PillButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // The emailed link signs the user in and lands on /change-password to pick a new one.
      const { error: resetError } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/change-password`,
      });
      // Same answer whether or not the address has an account, so the form can't be used to find accounts.
      // Only rate limits are worth telling the user about.
      if (resetError && /rate|too many/i.test(resetError.message)) {
        setError("Too many attempts. Wait a few minutes and try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send the email. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" accent="for a reset link" subtitle="If that address has an account, a link to set a new password is on its way.">
        <Link href="/login" className="text-sm font-medium text-white underline underline-offset-4">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" accent="we'll email a link" subtitle="Enter the email you sign in with.">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          onDark
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
        {error ? (
          <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <PillButton type="submit" loading={isLoading} className="w-full">
          {isLoading ? "Sending…" : "Send reset link"}
        </PillButton>
        <p className="text-center text-sm">
          <Link href="/login" className="text-white/80 underline underline-offset-4 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 6: Link from login** — in `src/app/login/page.tsx` add `import Link from "next/link";` and, directly after the closing `</PillButton>` of the sign-in button (inside the form), add:

```tsx
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-white/80 underline underline-offset-4 hover:text-white">
            Forgot password?
          </Link>
        </p>
```

- [ ] **Step 7: README** — add to Setup, as a new step 5 (renumber the dev-server step to 6):

```markdown
5. Supabase → Authentication:
   - **SMTP settings:** use Resend (host `smtp.resend.com`, port 465, user `resend`, password = `RESEND_API_KEY`,
     sender on your verified domain). The built-in mailer only sends a couple of emails an hour, so
     "Forgot password?" emails would silently stop.
   - **URL configuration → Redirect URLs:** add `https://<your app domain>/change-password` and
     `http://localhost:3000/change-password`.
```

- [ ] **Step 8: Verify in the browser** — `preview_start` the dev server, open `/login`, click "Forgot password?", submit an address, confirm the "Check your email" card renders. (The actual email needs step 7's Supabase settings.)

- [ ] **Step 9: Commit**

```bash
git add src/app/forgot-password/page.tsx src/app/login/page.tsx src/lib/hostRouting.ts tests/hostRouting.test.mjs README.md
git commit -m "Accounts: forgot-password flow via Supabase reset email"
```

---

### Task 4: Sitemap and robots.txt per site

**Files:**
- Create: `src/lib/sitemap.ts` (pure)
- Create: `src/lib/siteSeoFiles.server.ts`
- Create: `src/app/[slug]/sitemap.xml/route.ts`, `src/app/[slug]/robots.txt/route.ts`
- Create: `src/app/d/[hostname]/sitemap.xml/route.ts`, `src/app/d/[hostname]/robots.txt/route.ts`
- Create: `src/app/robots.ts` (platform host)
- Modify: `src/lib/hostRouting.ts` (`isBypassPath`)
- Test: `tests/sitemap.test.mjs`, `tests/hostRouting.test.mjs`

**Interfaces:**
- Produces:
  - `type SitemapEntry = { path: string; lastmod?: string | null }`
  - `sitemapXml(origin: string, entries: SitemapEntry[]): string`
  - `robotsTxt(origin: string, live: boolean): string`
  - `sitemapResponse(lookup: "slug" | "hostname", value: string): Promise<Response>`
  - `robotsResponse(lookup: "slug" | "hostname", value: string): Promise<Response>`

- [ ] **Step 1: Failing tests**

`tests/sitemap.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { robotsTxt, sitemapXml } from "../src/lib/sitemap.ts";

test("sitemap lists absolute URLs with lastmod dates, escaping XML", () => {
  const xml = sitemapXml("https://kings.soothecontrols.site", [
    { path: "", lastmod: "2026-10-01T10:00:00Z" },
    { path: "/about" },
    { path: "/shop/bread-&-butter" },
  ]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/kings\.soothecontrols\.site\/<\/loc><lastmod>2026-10-01<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/kings\.soothecontrols\.site\/about<\/loc><\/url>/);
  assert.match(xml, /bread-&amp;-butter/);
});

test("sitemap drops duplicate paths and trailing slashes on the origin", () => {
  const xml = sitemapXml("https://x.com/", [{ path: "/a" }, { path: "/a" }]);
  assert.equal(xml.match(/<loc>/g).length, 1);
  assert.match(xml, /<loc>https:\/\/x\.com\/a<\/loc>/);
});

test("robots: live sites point at the sitemap, offline sites are closed", () => {
  assert.equal(robotsTxt("https://x.com", true), "User-agent: *\nAllow: /\n\nSitemap: https://x.com/sitemap.xml\n");
  assert.equal(robotsTxt("https://x.com", false), "User-agent: *\nDisallow: /\n");
});
```

Append to `tests/hostRouting.test.mjs`:

```js
test("sitemap.xml and robots.txt on a site host go to that site", () => {
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/sitemap.xml", "soothecontrols.site"), "/bakery/sitemap.xml");
  assert.equal(rewritePathForHost("client.com", "/robots.txt", "soothecontrols.site"), "/d/client.com/robots.txt");
  assert.equal(rewritePathForHost("soothecontrols.site", "/robots.txt", "soothecontrols.site"), null);
});
```

- [ ] **Step 2: Run both test files** — Expected: FAIL (module missing; bypass returns null).

- [ ] **Step 3: `src/lib/hostRouting.ts`** — in `isBypassPath` delete these two lines:

```ts
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
```

and remove the now-trailing `||` from the `pathname === "/favicon.ico"` line so it ends with `pathname === "/favicon.ico"`. Check the existing bypass test in `tests/hostRouting.test.mjs` (line ~40) does not list `/robots.txt` or `/sitemap.xml`; if it does, remove them from that list.

- [ ] **Step 4: Create `src/lib/sitemap.ts`**

```ts
// Pure builders for a site's sitemap.xml and robots.txt. Relative imports only (unit-tested).

export type SitemapEntry = { path: string; lastmod?: string | null };

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapXml(origin: string, entries: SitemapEntry[]): string {
  const base = origin.replace(/\/+$/, "");
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const e of entries) {
    const loc = `${base}${e.path.startsWith("/") ? e.path : `/${e.path}`}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    const day = e.lastmod ? e.lastmod.slice(0, 10) : "";
    urls.push(`<url><loc>${xmlEscape(loc)}</loc>${/^\d{4}-\d{2}-\d{2}$/.test(day) ? `<lastmod>${day}</lastmod>` : ""}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function robotsTxt(origin: string, live: boolean): string {
  if (!live) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin.replace(/\/+$/, "")}/sitemap.xml\n`;
}
```

- [ ] **Step 5: Run `tests/sitemap.test.mjs` and `tests/hostRouting.test.mjs`** — Expected: PASS.

- [ ] **Step 6: Create `src/lib/siteSeoFiles.server.ts`**

```ts
import { loadPublicSite, type SiteLookup } from "@/lib/publicSite.server";
import { robotsTxt, sitemapXml, type SitemapEntry } from "@/lib/sitemap";
import { supabaseServer } from "@/lib/supabase/server";

type Row = { key: string; updated_at: string | null };

/** Published pages (+ shop and its products when the shop is on) of one site, as sitemap paths. */
async function sitemapEntries(siteId: string): Promise<SitemapEntry[]> {
  const db = supabaseServer();
  const [pages, extras, shop, products] = await Promise.all([
    db.from("pages").select("key, updated_at").eq("site_id", siteId).eq("status", "published"),
    db.from("extra_pages").select("key, updated_at").eq("site_id", siteId).eq("status", "published"),
    db.from("shop_settings").select("enabled, updated_at").eq("site_id", siteId).maybeSingle(),
    db.from("products").select("slug, updated_at").eq("site_id", siteId).eq("active", true).limit(1000),
  ]);
  const entries: SitemapEntry[] = [];
  for (const p of (pages.data ?? []) as Row[]) entries.push({ path: p.key === "home" ? "/" : `/${p.key}`, lastmod: p.updated_at });
  for (const p of (extras.data ?? []) as Row[]) entries.push({ path: `/p/${p.key}`, lastmod: p.updated_at });
  const shopRow = shop.data as { enabled: boolean; updated_at: string | null } | null;
  if (shopRow?.enabled) {
    entries.push({ path: "/shop", lastmod: shopRow.updated_at });
    for (const p of (products.data ?? []) as Array<{ slug: string; updated_at: string | null }>) {
      entries.push({ path: `/shop/${p.slug}`, lastmod: p.updated_at });
    }
  }
  return entries;
}

async function siteOrigin(lookup: SiteLookup, value: string) {
  const ctx = await loadPublicSite(lookup, value);
  if (!ctx || !ctx.canonicalHost) return null;
  return { ctx, origin: `https://${ctx.canonicalHost}${ctx.baseUrl}` };
}

export async function sitemapResponse(lookup: SiteLookup, value: string): Promise<Response> {
  const found = await siteOrigin(lookup, value);
  if (!found || found.ctx.siteData.site.status !== "published") return new Response("Not found", { status: 404 });
  const xml = sitemapXml(found.origin, await sitemapEntries(found.ctx.siteData.site.id));
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}

export async function robotsResponse(lookup: SiteLookup, value: string): Promise<Response> {
  const found = await siteOrigin(lookup, value);
  const live = Boolean(found && found.ctx.siteData.site.status === "published");
  return new Response(robotsTxt(found?.origin ?? "", live), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
```

- [ ] **Step 7: Create the four route files**

`src/app/[slug]/sitemap.xml/route.ts`:

```ts
import { sitemapResponse } from "@/lib/siteSeoFiles.server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return sitemapResponse("slug", (await ctx.params).slug);
}
```

`src/app/[slug]/robots.txt/route.ts`:

```ts
import { robotsResponse } from "@/lib/siteSeoFiles.server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return robotsResponse("slug", (await ctx.params).slug);
}
```

`src/app/d/[hostname]/sitemap.xml/route.ts`:

```ts
import { sitemapResponse } from "@/lib/siteSeoFiles.server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ hostname: string }> }) {
  return sitemapResponse("hostname", decodeURIComponent((await ctx.params).hostname));
}
```

`src/app/d/[hostname]/robots.txt/route.ts`:

```ts
import { robotsResponse } from "@/lib/siteSeoFiles.server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ hostname: string }> }) {
  return robotsResponse("hostname", decodeURIComponent((await ctx.params).hostname));
}
```

- [ ] **Step 8: Create `src/app/robots.ts`** (platform host only; site hosts are rewritten before reaching it)

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: ["/admin", "/dashboard", "/api", "/dev", "/login", "/change-password", "/forgot-password"] },
  };
}
```

- [ ] **Step 9: Verify in the browser** — dev server, open `/<a published slug>/sitemap.xml` and `/<slug>/robots.txt`, and `/robots.txt`. Expected: XML with the published pages; robots with the Sitemap line; platform robots disallowing `/admin`.

- [ ] **Step 10: Run** `npm test && npm run lint && npm run typecheck` — Expected: pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/sitemap.ts src/lib/siteSeoFiles.server.ts "src/app/[slug]/sitemap.xml" "src/app/[slug]/robots.txt" "src/app/d/[hostname]/sitemap.xml" "src/app/d/[hostname]/robots.txt" src/app/robots.ts src/lib/hostRouting.ts tests/sitemap.test.mjs tests/hostRouting.test.mjs
git commit -m "SEO: sitemap.xml and robots.txt for every site"
```

---

### Task 5: Archive, restore and delete a site

**Files:**
- Create: `supabase/migrations/017_site_archive.sql`
- Create: `src/lib/siteLifecycle.ts` (pure)
- Create: `src/app/api/admin/sites/[siteId]/lifecycle/route.ts`
- Create: `src/components/admin/site/SiteLifecycleSection.tsx`
- Modify: `src/app/admin/sites/[siteId]/page.tsx` (mount the section)
- Modify: `src/app/admin/sites/page.tsx` (Archived label + filter)
- Modify: `README.md` (migration list)
- Test: `tests/siteLifecycle.test.mjs`

**Interfaces:**
- Produces:
  - `type LifecycleAction = "archive" | "restore"`
  - `lifecycleUpdate(action: LifecycleAction, now: Date): { status: "suspended" | "draft"; archived_at: string | null }`
  - `canHardDelete(site: { slug: string; archived_at: string | null }, confirmSlug: unknown): string | null` — error message or null
  - `storageFilePaths(entries: Array<{ name: string; id: string | null }>, prefix: string): { files: string[]; folders: string[] }`

- [ ] **Step 1: Failing test** — `tests/siteLifecycle.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { canHardDelete, lifecycleUpdate, storageFilePaths } from "../src/lib/siteLifecycle.ts";

test("archive takes the site offline and stamps the time; restore brings it back as a draft", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  assert.deepEqual(lifecycleUpdate("archive", now), { status: "suspended", archived_at: "2026-10-06T12:00:00.000Z" });
  assert.deepEqual(lifecycleUpdate("restore", now), { status: "draft", archived_at: null });
});

test("hard delete needs an archived site and its exact slug", () => {
  assert.match(canHardDelete({ slug: "kings", archived_at: null }, "kings"), /Archive/);
  assert.match(canHardDelete({ slug: "kings", archived_at: "2026-10-01" }, "king"), /slug/);
  assert.match(canHardDelete({ slug: "kings", archived_at: "2026-10-01" }, undefined), /slug/);
  assert.equal(canHardDelete({ slug: "kings", archived_at: "2026-10-01" }, " kings "), null);
});

test("storage listing splits files from folders under a prefix", () => {
  const r = storageFilePaths(
    [{ name: "logo", id: null }, { name: "a.png", id: "1" }, { name: "b.jpg", id: "2" }],
    "site-1",
  );
  assert.deepEqual(r, { files: ["site-1/a.png", "site-1/b.jpg"], folders: ["site-1/logo"] });
});
```

- [ ] **Step 2: Run** `node --experimental-strip-types --no-warnings --test tests/siteLifecycle.test.mjs` — Expected: FAIL (module missing).

- [ ] **Step 3: Create `src/lib/siteLifecycle.ts`**

```ts
// Pure rules for archiving, restoring and permanently deleting a site. Relative imports only (unit-tested).

export type LifecycleAction = "archive" | "restore";

/** Archived = status 'suspended' + archived_at (public policies only serve 'published' sites). */
export function lifecycleUpdate(action: LifecycleAction, now: Date): { status: "suspended" | "draft"; archived_at: string | null } {
  return action === "archive"
    ? { status: "suspended", archived_at: now.toISOString() }
    : { status: "draft", archived_at: null };
}

/** Error message when the site may not be deleted yet, else null. */
export function canHardDelete(site: { slug: string; archived_at: string | null }, confirmSlug: unknown): string | null {
  if (!site.archived_at) return "Archive the site before deleting it.";
  if (typeof confirmSlug !== "string" || confirmSlug.trim() !== site.slug) return "Type the site's slug exactly to confirm.";
  return null;
}

/** Supabase Storage lists one level at a time; folders come back with id null. */
export function storageFilePaths(entries: Array<{ name: string; id: string | null }>, prefix: string) {
  const files: string[] = [];
  const folders: string[] = [];
  for (const e of entries) (e.id ? files : folders).push(`${prefix}/${e.name}`);
  return { files, folders };
}
```

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Create `supabase/migrations/017_site_archive.sql`**

```sql
-- 017_site_archive.sql — run once in Supabase SQL Editor (after 001-016). Idempotent.
-- Archived site = status 'suspended' + archived_at set. Public policies already serve only 'published'
-- sites, so an archived site is offline at once. Archive/restore/delete go through
-- /api/admin/sites/[siteId]/lifecycle with the service role.
alter table public.sites add column if not exists archived_at timestamptz null;
```

- [ ] **Step 6: Create `src/app/api/admin/sites/[siteId]/lifecycle/route.ts`**

```ts
import { NextResponse } from "next/server";

import { canHardDelete, lifecycleUpdate, storageFilePaths, type LifecycleAction } from "@/lib/siteLifecycle";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Archive or restore: the site's admin (or a super admin).
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`lifecycle:${auth.userId}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const { action } = await readJson(req);
  if (action !== "archive" && action !== "restore") {
    return NextResponse.json({ error: "action must be archive or restore." }, { status: 400 });
  }
  const { data, error } = await supabaseService()
    .from("sites")
    .update(lifecycleUpdate(action as LifecycleAction, new Date()))
    .eq("id", siteId)
    .select("id, status, archived_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site: data });
}

// Permanent delete: super admins only, archived sites only, slug typed to confirm.
export async function DELETE(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;

  const db = supabaseService();
  const { data: site, error } = await db.from("sites").select("id, slug, archived_at").eq("id", siteId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const { confirmSlug } = await readJson(req);
  const refusal = canHardDelete(site as { slug: string; archived_at: string | null }, confirmSlug);
  if (refusal) return NextResponse.json({ error: refusal }, { status: 400 });

  // Files first (rows cascade from sites, storage objects do not).
  const bucket = db.storage.from("site-assets");
  const queue = [siteId];
  while (queue.length) {
    const prefix = queue.shift()!;
    const { data: entries } = await bucket.list(prefix, { limit: 1000 });
    const { files, folders } = storageFilePaths((entries ?? []) as Array<{ name: string; id: string | null }>, prefix);
    if (files.length) await bucket.remove(files);
    queue.push(...folders);
  }

  const { error: delError } = await db.from("sites").delete().eq("id", siteId);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Create `src/components/admin/site/SiteLifecycleSection.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useIsSuperAdmin } from "@/components/admin/useIsSuperAdmin";
import { supabaseBrowser } from "@/lib/supabase/browser";

async function call(siteId: string, method: "POST" | "DELETE", body: object) {
  const { data } = await supabaseBrowser().auth.getSession();
  const res = await fetch(`/api/admin/sites/${siteId}/lifecycle`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed.");
}

export default function SiteLifecycleSection({ siteId, siteSlug, status }: { siteId: string; siteSlug: string; status: string }) {
  const router = useRouter();
  const isSuper = useIsSuperAdmin() === true;
  const archived = status === "suspended";
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const archiveOrRestore = () =>
    run(async () => {
      if (!archived && !window.confirm("Archive this site? It goes offline straight away. You can restore it later.")) return;
      await call(siteId, "POST", { action: archived ? "restore" : "archive" });
      window.location.reload();
    });

  const hardDelete = () =>
    run(async () => {
      await call(siteId, "DELETE", { confirmSlug: confirm });
      router.replace("/admin/sites");
    });

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-6 ring-1 ring-koi-ink/5">
      <h2 className="text-lg font-semibold tracking-tight text-koi-ink">{archived ? "Archived site" : "Archive site"}</h2>
      <p className="mt-1 text-sm text-koi-ink/60">
        {archived
          ? "This site is offline. Restore it to bring it back as a draft, then publish."
          : "Takes the site offline without deleting anything. Owners keep access to their dashboard."}
      </p>
      <button
        type="button"
        onClick={archiveOrRestore}
        disabled={busy}
        className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/15 hover:bg-koi-ink/5 disabled:opacity-60"
      >
        {busy ? "Working…" : archived ? "Restore site" : "Archive site"}
      </button>

      {archived && isSuper ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-800">Delete permanently</div>
          <p className="mt-1 text-sm text-red-700">
            Removes the site, its pages, shop, orders, inbox and files. This cannot be undone. Type <b>{siteSlug}</b> to confirm.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={siteSlug}
              className="w-full rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-red-200"
            />
            <button
              type="button"
              onClick={hardDelete}
              disabled={busy || confirm.trim() !== siteSlug}
              className="rounded-full bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              Delete forever
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
```

- [ ] **Step 8: Mount it** — in `src/app/admin/sites/[siteId]/page.tsx` add `import SiteLifecycleSection from "@/components/admin/site/SiteLifecycleSection";` and, directly after the `<DomainsSection … />` element (≈ line 420), add:

```tsx
        <SiteLifecycleSection siteId={siteId} siteSlug={site.slug} status={site.status} />
```

- [ ] **Step 9: Sites list** — in `src/app/admin/sites/page.tsx`:
  - `type StatusFilter = "all" | "live" | "draft" | "archived";`
  - In `statusLabel`, before the final `return`, add `if (status === "suspended") return "Archived";`
  - In the `counts` memo add `archived: sites.filter((s) => s.status === "suspended").length,` and change the `all` count to `sites.filter((s) => s.status !== "suspended").length`.
  - In the `filtered` memo, replace the two `filter ===` lines with:

```ts
      if (filter === "archived" ? s.status !== "suspended" : s.status === "suspended") return false;
      if (filter === "live" && s.status !== "published") return false;
      if (filter === "draft" && s.status !== "draft") return false;
```

  - In the `<Tabs items={…}>` array add `{ id: "archived", label: "Archived", count: counts.archived },` as the last item.

- [ ] **Step 10: README** — in Setup step 3, after the `016` line add: `- \`supabase/migrations/017_site_archive.sql\` (archive / restore / delete sites)`. Also add the `016_shop_on_by_default.sql` line above it if it is missing.

- [ ] **Step 11: Verify** — run migration 017 in Supabase (ask the user), then in the browser: archive a test site → public URL 404s, list shows it under Archived; restore → Draft. As super admin, delete an archived test site.

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/017_site_archive.sql src/lib/siteLifecycle.ts "src/app/api/admin/sites/[siteId]/lifecycle/route.ts" src/components/admin/site/SiteLifecycleSection.tsx "src/app/admin/sites/[siteId]/page.tsx" src/app/admin/sites/page.tsx tests/siteLifecycle.test.mjs README.md
git commit -m "Sites: archive, restore and (super admin) permanent delete"
```

---

### Task 6: Page revisions

**Files:**
- Create: `supabase/migrations/018_page_revisions.sql`
- Create: `src/lib/pageRevisions.ts`
- Create: `src/components/site-editor/RevisionHistory.tsx`
- Modify: `src/components/site-editor/PageEditor.tsx`, `src/components/site-editor/ExtraPageEditor.tsx`
- Modify: `README.md` (migration list)
- Test: `tests/pageRevisions.test.mjs`

**Interfaces:**
- Produces:
  - `type PageRevision = { id: number; created_at: string; status: string; data: unknown }`
  - `revisionLabel(createdAt: string, now: Date): string` (pure)
  - `listPageRevisions(siteId: string, pageKind: "core" | "extra", pageKey: string): Promise<PageRevision[]>`
  - `<RevisionHistory siteId pageKind pageKey onLoad={(data: PageData) => void} />`

- [ ] **Step 1: Failing test** — `tests/pageRevisions.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { revisionLabel } from "../src/lib/pageRevisions.ts";

const now = new Date("2026-10-06T12:00:00Z");

test("recent revisions read as relative times, older ones as dates", () => {
  assert.equal(revisionLabel("2026-10-06T11:59:40Z", now), "just now");
  assert.equal(revisionLabel("2026-10-06T11:15:00Z", now), "45 min ago");
  assert.equal(revisionLabel("2026-10-06T07:00:00Z", now), "5 h ago");
  assert.equal(revisionLabel("2026-09-30T08:00:00Z", now), "30 Sep 2026");
});
```

- [ ] **Step 2: Run** — Expected: FAIL (module missing).

- [ ] **Step 3: Create `src/lib/pageRevisions.ts`**

The test imports this file with the Node runner, so the Supabase import must be a lazy dynamic import inside the function (the `@/` path is only resolved by Next.js):

```ts
// Saved earlier versions of a page (migration 018 trigger). Read-only for editors; restoring loads a
// version into the editor as an unsaved draft.

export type PageRevision = { id: number; created_at: string; status: string; data: unknown };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function revisionLabel(createdAt: string, now: Date): string {
  const t = new Date(createdAt);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

export async function listPageRevisions(siteId: string, pageKind: "core" | "extra", pageKey: string): Promise<PageRevision[]> {
  const { getAuthenticatedClient } = await import("@/lib/supabase/browser");
  const supabase = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("page_revisions")
    .select("id, created_at, status, data")
    .eq("site_id", siteId)
    .eq("page_kind", pageKind)
    .eq("page_key", pageKey)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as PageRevision[];
}
```

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Create `supabase/migrations/018_page_revisions.sql`**

```sql
-- 018_page_revisions.sql — run once in Supabase SQL Editor (after 017). Idempotent.
-- Every save that changes a page's content stores the PREVIOUS content here (last 30 per page), so
-- manual edits can be undone from the editor's History panel. Written only by the trigger.
--
-- Check after running:
--   update public.pages set data = data || '{}'::jsonb where false;  -- no-op, no revision
--   select count(*) from public.page_revisions;                       -- grows by one per real save

create table if not exists public.page_revisions (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  page_kind text not null check (page_kind in ('core', 'extra')),
  page_key text not null,
  status text not null,
  data jsonb not null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists page_revisions_page_idx
  on public.page_revisions (site_id, page_kind, page_key, created_at desc);

alter table public.page_revisions enable row level security;
revoke all on table public.page_revisions from anon, authenticated;
grant select on table public.page_revisions to authenticated;
grant all on table public.page_revisions to service_role;

drop policy if exists editors_read on public.page_revisions;
create policy editors_read on public.page_revisions for select to authenticated
  using (public.can_edit_site(site_id));

create or replace function public.record_page_revision() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text := case when tg_table_name = 'pages' then 'core' else 'extra' end;
begin
  if new.data is distinct from old.data then
    insert into public.page_revisions (site_id, page_kind, page_key, status, data, created_by)
    values (old.site_id, v_kind, old.key::text, old.status::text, old.data, auth.uid());

    delete from public.page_revisions r
     where r.site_id = old.site_id and r.page_kind = v_kind and r.page_key = old.key::text
       and r.id not in (
         select id from public.page_revisions
          where site_id = old.site_id and page_kind = v_kind and page_key = old.key::text
          order by created_at desc, id desc
          limit 30);
  end if;
  return new;
end $$;

drop trigger if exists pages_revision on public.pages;
create trigger pages_revision after update on public.pages
  for each row execute function public.record_page_revision();

drop trigger if exists extra_pages_revision on public.extra_pages;
create trigger extra_pages_revision after update on public.extra_pages
  for each row execute function public.record_page_revision();
```

- [ ] **Step 6: Create `src/components/site-editor/RevisionHistory.tsx`**

```tsx
"use client";

import { useState } from "react";

import { validatePageData, type PageData } from "@/lib/pageSchema";
import { listPageRevisions, revisionLabel, type PageRevision } from "@/lib/pageRevisions";

export default function RevisionHistory({
  siteId,
  pageKind,
  pageKey,
  onLoad,
}: {
  siteId: string;
  pageKind: "core" | "extra";
  pageKey: string;
  onLoad: (data: PageData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PageRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setError(null);
    setRows(null);
    try {
      setRows(await listPageRevisions(siteId, pageKind, pageKey));
    } catch {
      setError("Could not load history. Is migration 018 installed?");
    }
  }

  function load(r: PageRevision) {
    if (!validatePageData(r.data).ok) {
      setError("That version can't be opened in this editor.");
      return;
    }
    onLoad(r.data as PageData);
    setOpen(false);
  }

  const now = new Date();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5"
      >
        History
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-koi-ink/10">
          <div className="text-sm font-semibold text-koi-ink">Earlier versions</div>
          <p className="mt-0.5 text-xs text-koi-ink/60">Load one into the editor, then save to keep it.</p>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {rows === null && !error ? <p className="mt-2 text-sm text-koi-ink/60">Loading…</p> : null}
          {rows && rows.length === 0 ? <p className="mt-2 text-sm text-koi-ink/60">No earlier versions yet.</p> : null}
          <ul className="mt-2 max-h-72 space-y-1 overflow-auto">
            {(rows ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-koi-paper">
                <span className="text-sm text-koi-ink">
                  {revisionLabel(r.created_at, now)}
                  <span className="ml-1 text-xs text-koi-ink/50">{r.status === "published" ? "· was live" : "· draft"}</span>
                </span>
                <button type="button" onClick={() => load(r)} className="text-sm font-medium text-koi-sea hover:underline">
                  Load
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: Wire into `PageEditor.tsx`** — add `import RevisionHistory from "./RevisionHistory";`. Directly before the Save Draft `<button type="button" onClick={onSaveDraft} …>` (≈ line 725) add:

```tsx
          {pageKey ? (
            <RevisionHistory
              siteId={siteId}
              pageKind="core"
              pageKey={pageKey}
              onLoad={(data) => {
                setPageDraft(data);
                syncRawFromDraft(data);
                setSaveSuccess(false);
              }}
            />
          ) : null}
```

- [ ] **Step 8: Wire into `ExtraPageEditor.tsx`** — add the same import. Directly before its `<button type="button" onClick={onSaveDraft} …>` (≈ line 241) add:

```tsx
          <RevisionHistory
            siteId={siteId}
            pageKind="extra"
            pageKey={key}
            onLoad={(data) => {
              setPageDraft(data);
              setRawText(JSON.stringify(data, null, 2));
              setRawError(null);
              setSaveSuccess(false);
            }}
          />
```

- [ ] **Step 9: README** — Setup step 3, after the 017 line: `- \`supabase/migrations/018_page_revisions.sql\` (page History: last 30 versions per page)`.

- [ ] **Step 10: Verify** — run 018 in Supabase (ask the user). In the browser: edit a page, save draft twice, open History → 2 versions; Load the older → editor shows it; Save draft → History now has 3.

- [ ] **Step 11: Run** `npm test && npm run lint && npm run typecheck`, then commit:

```bash
git add supabase/migrations/018_page_revisions.sql src/lib/pageRevisions.ts src/components/site-editor/RevisionHistory.tsx src/components/site-editor/PageEditor.tsx src/components/site-editor/ExtraPageEditor.tsx tests/pageRevisions.test.mjs README.md
git commit -m "Pages: history of the last 30 versions, loadable from the editor"
```

---

### Task 7: CI on every push

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 2: Verify locally** — `npm run lint && npm run typecheck && npm test` all exit 0 (delete `.next/types` first if typecheck reports the stale `generate-site` route).

- [ ] **Step 3: Commit, push, and check the run**

```bash
git add .github/workflows/ci.yml
git commit -m "CI: lint, typecheck and tests on every push"
git push origin main
gh run list --limit 1
```

Expected: the run completes green. If `npm ci` fails on lockfile drift, run `npm install` locally, commit `package-lock.json`, push again.

---

### Task 8: Error log

**Files:**
- Create: `supabase/migrations/019_app_errors.sql`
- Create: `src/lib/errorLog.ts` (pure)
- Create: `src/lib/errorLog.server.ts`
- Create: `src/instrumentation.ts`
- Create: `src/app/api/errors/route.ts`
- Create: `src/app/global-error.tsx`
- Modify: `README.md` (migration list)
- Test: `tests/errorLog.test.mjs`

**Interfaces:**
- Produces:
  - `type ErrorRow = { source: "server" | "browser"; message: string; digest: string | null; path: string | null; method: string | null }`
  - `errorRow(input: { source: "server" | "browser"; error?: unknown; message?: unknown; digest?: unknown; path?: unknown; method?: unknown }): ErrorRow`
  - `recordError(row: ErrorRow): Promise<void>` (never throws)

- [ ] **Step 1: Failing test** — `tests/errorLog.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { errorRow } from "../src/lib/errorLog.ts";

test("server errors keep message, digest, path and method", () => {
  const e = Object.assign(new Error("boom"), { digest: "123" });
  assert.deepEqual(errorRow({ source: "server", error: e, path: "/api/x", method: "post" }), {
    source: "server",
    message: "boom",
    digest: "123",
    path: "/api/x",
    method: "POST",
  });
});

test("query strings and fragments are dropped from paths (tokens, references)", () => {
  assert.equal(errorRow({ source: "browser", message: "x", path: "/shop/order/abc?trxref=1&reference=2#t" }).path, "/shop/order/abc");
});

test("long or odd input is trimmed and typed", () => {
  const r = errorRow({ source: "browser", message: "y".repeat(5000), digest: 42, path: 7, method: "<script>" });
  assert.equal(r.message.length, 500);
  assert.equal(r.digest, null);
  assert.equal(r.path, null);
  assert.equal(r.method, null);
  assert.equal(errorRow({ source: "server" }).message, "Unknown error");
});
```

- [ ] **Step 2: Run** — Expected: FAIL (module missing).

- [ ] **Step 3: Create `src/lib/errorLog.ts`**

```ts
// Shapes an error for the app_errors table. Keeps only what helps find the bug: never bodies, headers
// or query strings (payment references, tokens). Relative imports only (unit-tested).

export type ErrorRow = {
  source: "server" | "browser";
  message: string;
  digest: string | null;
  path: string | null;
  method: string | null;
};

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function errorRow(input: {
  source: "server" | "browser";
  error?: unknown;
  message?: unknown;
  digest?: unknown;
  path?: unknown;
  method?: unknown;
}): ErrorRow {
  const err = input.error as { message?: unknown; digest?: unknown } | undefined;
  const path = str(input.path, 300)?.split(/[?#]/)[0] ?? null;
  const method = str(input.method, 10)?.toUpperCase() ?? null;
  return {
    source: input.source,
    message: str(err?.message ?? input.message, 500) ?? "Unknown error",
    digest: str(err?.digest ?? input.digest, 100),
    path: path && path.startsWith("/") ? path : null,
    method: method && /^[A-Z]+$/.test(method) ? method : null,
  };
}
```

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Create `supabase/migrations/019_app_errors.sql`**

```sql
-- 019_app_errors.sql — run once in Supabase SQL Editor (after 018). Idempotent.
-- Server and browser errors, shown on the admin overview. Service role only.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  source text not null check (source in ('server', 'browser')),
  message text not null,
  digest text null,
  path text null,
  method text null,
  created_at timestamptz not null default now()
);

create index if not exists app_errors_created_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;
revoke all on table public.app_errors from anon, authenticated;
grant all on table public.app_errors to service_role;
grant usage, select on sequence public.app_errors_id_seq to service_role;
```

- [ ] **Step 6: Create `src/lib/errorLog.server.ts`**

```ts
import type { ErrorRow } from "@/lib/errorLog";
import { supabaseServer } from "@/lib/supabase/server";

/** Best effort: an error while logging an error is only printed. */
export async function recordError(row: ErrorRow): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { error } = await supabaseServer().from("app_errors").insert(row);
    if (error) console.error("app_errors insert failed:", error.message);
  } catch (e) {
    console.error("app_errors insert failed:", e instanceof Error ? e.message : e);
  }
}
```

- [ ] **Step 7: Create `src/instrumentation.ts`**

```ts
export function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  const { errorRow } = await import("@/lib/errorLog");
  const { recordError } = await import("@/lib/errorLog.server");
  await recordError(errorRow({ source: "server", error: err, path: request.path, method: request.method }));
}
```

- [ ] **Step 8: Create `src/app/api/errors/route.ts`**

```ts
import { NextResponse } from "next/server";

import { errorRow } from "@/lib/errorLog";
import { recordError } from "@/lib/errorLog.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";

// Browser crash reports from global-error.tsx. Anonymous, so rate-limited per IP.
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";
  const limited = rateLimit(`errors:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await recordError(errorRow({ source: "browser", message: body.message, digest: body.digest, path: body.path }));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9: Create `src/app/global-error.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>We have been notified. Please try again.</p>
          <button type="button" onClick={reset} style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: README** — Setup step 3: `- \`supabase/migrations/019_app_errors.sql\` (error log shown on the admin overview)`.

- [ ] **Step 11: Verify** — run 019 in Supabase (ask the user). With the dev server, `curl -X POST localhost:3000/api/errors -H "content-type: application/json" -d "{\"message\":\"test\",\"path\":\"/x?secret=1\"}"` → `{"ok":true}`; the row in `app_errors` has path `/x`.

- [ ] **Step 12: Run** `npm test && npm run lint && npm run typecheck`, then commit:

```bash
git add supabase/migrations/019_app_errors.sql src/lib/errorLog.ts src/lib/errorLog.server.ts src/instrumentation.ts src/app/api/errors/route.ts src/app/global-error.tsx tests/errorLog.test.mjs README.md
git commit -m "Ops: log server and browser errors to app_errors"
```

---

### Task 9: Admin overview

**Files:**
- Create: `src/lib/adminOverview.ts` (pure)
- Create: `src/app/api/admin/overview/route.ts`
- Modify: `src/app/admin/page.tsx` (replace redirect)
- Test: `tests/adminOverview.test.mjs`

**Interfaces:**
- Consumes: `app_errors` (Task 8), `sites.archived_at` / `suspended` (Task 5) — both optional: missing tables count as 0.
- Produces:
  - `type Overview = { sites: { live: number; draft: number; archived: number }; inboxNew: number; ordersToHandle: number; aiThisMonth: number; domainsPending: number; errors24h: number | null }`
  - `siteCounts(rows: Array<{ status: string }>): Overview["sites"]`

- [ ] **Step 1: Failing test** — `tests/adminOverview.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { siteCounts } from "../src/lib/adminOverview.ts";

test("site counts by status, suspended = archived", () => {
  assert.deepEqual(siteCounts([{ status: "published" }, { status: "published" }, { status: "draft" }, { status: "suspended" }]), {
    live: 2,
    draft: 1,
    archived: 1,
  });
  assert.deepEqual(siteCounts([]), { live: 0, draft: 0, archived: 0 });
});
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/adminOverview.ts`**

```ts
// Shapes for the /admin overview. Relative imports only (unit-tested).

export type Overview = {
  sites: { live: number; draft: number; archived: number };
  inboxNew: number;
  ordersToHandle: number;
  aiThisMonth: number;
  domainsPending: number;
  /** Super admins only; null for other admins. */
  errors24h: number | null;
};

export function siteCounts(rows: Array<{ status: string }>): Overview["sites"] {
  const c = { live: 0, draft: 0, archived: 0 };
  for (const r of rows) {
    if (r.status === "published") c.live++;
    else if (r.status === "suspended") c.archived++;
    else c.draft++;
  }
  return c;
}
```

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Create `src/app/api/admin/overview/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { siteCounts, type Overview } from "@/lib/adminOverview";
import { isSuperAdmin } from "@/lib/supabase/adminScope";
import { supabaseService } from "@/lib/supabase/admin.server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const countOf = (r: { count: number | null; error: unknown }) => (r.error ? 0 : r.count ?? 0);

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  // Super admin check as the caller (RLS), everything else with the service role, scoped to their sites.
  const token = (req.headers.get("authorization") ?? "").slice(7).trim();
  const asCaller = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const isSuper = await isSuperAdmin(asCaller).catch(() => false);

  const db = supabaseService();
  let sitesQuery = db.from("sites").select("id, status");
  if (!isSuper) sitesQuery = sitesQuery.eq("created_by", auth.userId);
  const { data: sites, error } = await sitesQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (sites ?? []).map((s) => s.id as string);
  const scope = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [inbox, orders, ai, domains, errors] = await Promise.all([
    db.from("inbox_messages").select("id", { count: "exact", head: true }).in("site_id", scope).eq("status", "new"),
    db.from("orders").select("id", { count: "exact", head: true }).in("site_id", scope).eq("status", "paid"),
    db.from("ai_usage").select("id", { count: "exact", head: true }).in("site_id", scope).gte("created_at", monthStart),
    db.from("domains").select("id", { count: "exact", head: true }).in("site_id", scope).eq("status", "pending"),
    isSuper
      ? db.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", dayAgo)
      : Promise.resolve({ count: null, error: null }),
  ]);

  const overview: Overview = {
    sites: siteCounts((sites ?? []) as Array<{ status: string }>),
    inboxNew: countOf(inbox),
    ordersToHandle: countOf(orders),
    aiThisMonth: countOf(ai),
    domainsPending: countOf(domains),
    errors24h: isSuper ? countOf(errors) : null,
  };
  return NextResponse.json(overview);
}
```

Note: "orders to handle" = paid but not yet fulfilled (`status = 'paid'`).

- [ ] **Step 6: Replace `src/app/admin/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Overview } from "@/lib/adminOverview";
import { supabaseBrowser } from "@/lib/supabase/browser";

function Stat({ label, value, href, warn }: { label: string; value: number | string; href?: string; warn?: boolean }) {
  const body = (
    <div className={`rounded-3xl bg-white p-5 ring-1 ${warn ? "ring-koi-orange/50" : "ring-koi-ink/5"}`}>
      <div className="text-sm text-koi-ink/60">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-koi-ink">{value}</div>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default function AdminHomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabaseBrowser().auth.getSession();
      const res = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${s.session?.access_token ?? ""}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError((json as { error?: string }).error ?? "Could not load the overview.");
      else setData(json as Overview);
    })().catch(() => setError("Could not load the overview."));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-koi-ink">Overview</h1>
        <Link href="/admin/sites" className="rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black">
          All sites
        </Link>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!data && !error ? <p className="text-sm text-koi-ink/60">Loading…</p> : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Live sites" value={data.sites.live} href="/admin/sites" />
          <Stat label="Drafts" value={data.sites.draft} href="/admin/sites" />
          <Stat label="Archived" value={data.sites.archived} href="/admin/sites" />
          <Stat label="New enquiries" value={data.inboxNew} warn={data.inboxNew > 0} />
          <Stat label="Paid orders to fulfil" value={data.ordersToHandle} warn={data.ordersToHandle > 0} />
          <Stat label="Ask AI requests this month" value={data.aiThisMonth} />
          <Stat label="Domains waiting for DNS" value={data.domainsPending} warn={data.domainsPending > 0} />
          {data.errors24h !== null ? <Stat label="Errors in the last 24 h" value={data.errors24h} warn={data.errors24h > 0} /> : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: Check the admin shell still leads somewhere sensible** — open `/admin` in the browser: the overview renders inside the admin layout; "All sites" goes to `/admin/sites`. If the admin nav has a "Sites" item pointing at `/admin`, leave it — `/admin/sites` is one click away.

- [ ] **Step 8: Run** `npm test && npm run lint && npm run typecheck`, then commit:

```bash
git add src/lib/adminOverview.ts src/app/api/admin/overview/route.ts src/app/admin/page.tsx tests/adminOverview.test.mjs
git commit -m "Admin: overview of sites, enquiries, orders, AI use, domains and errors"
```

---

### Task 10: Custom domains through Vercel

**Files:**
- Create: `src/lib/vercelDomains.server.ts` (relative imports only — unit-tested)
- Create: `src/app/api/admin/sites/[siteId]/domains/route.ts`
- Modify: `src/components/admin/site/DomainsSection.tsx`
- Modify: `README.md` (env vars)
- Test: `tests/vercelDomains.test.mjs`

**Interfaces:**
- Produces:
  - `type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string }`
  - `type DomainState = { configured: boolean; verified: boolean; misconfigured: boolean; records: DnsRecord[] }`
  - `vercelConfigured(env): boolean`
  - `isApexDomain(name: string): boolean`
  - `dnsRecordsFor(name: string, verification: Array<{ type: string; domain: string; value: string }>): DnsRecord[]`
  - `addProjectDomain(name: string, deps?: VercelDeps): Promise<void>`
  - `getDomainState(name: string, deps?: VercelDeps): Promise<DomainState>`
  - `removeProjectDomain(name: string, deps?: VercelDeps): Promise<void>`
  - `type VercelDeps = { fetch?: typeof fetch; env?: Record<string, string | undefined> }`

- [ ] **Step 1: Failing test** — `tests/vercelDomains.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addProjectDomain,
  dnsRecordsFor,
  getDomainState,
  isApexDomain,
  removeProjectDomain,
  vercelConfigured,
} from "../src/lib/vercelDomains.server.ts";

const env = { VERCEL_TOKEN: "t", VERCEL_PROJECT_ID: "prj_1", VERCEL_TEAM_ID: "team_1" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function fake(...answers) {
  const calls = [];
  return {
    calls,
    deps: {
      env,
      fetch: async (url, init = {}) => {
        calls.push({ url: String(url), method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : null, auth: init.headers?.Authorization });
        return answers.shift() ?? json({});
      },
    },
  };
}

test("configured only with a token and a project id", () => {
  assert.equal(vercelConfigured(env), true);
  assert.equal(vercelConfigured({ VERCEL_TOKEN: "t" }), false);
});

test("apex detection knows two-level country suffixes", () => {
  assert.equal(isApexDomain("kingsbakery.com"), true);
  assert.equal(isApexDomain("kingsbakery.com.ng"), true);
  assert.equal(isApexDomain("shop.kingsbakery.com"), false);
  assert.equal(isApexDomain("shop.kingsbakery.com.ng"), false);
});

test("DNS records: A for apex, CNAME for subdomains, plus Vercel's TXT checks", () => {
  assert.deepEqual(dnsRecordsFor("kings.com", []), [
    { type: "A", name: "@", value: "76.76.21.21" },
    { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
  ]);
  assert.deepEqual(dnsRecordsFor("shop.kings.com", [{ type: "TXT", domain: "_vercel.kings.com", value: "vc-domain-verify=abc" }]), [
    { type: "CNAME", name: "shop", value: "cname.vercel-dns.com" },
    { type: "TXT", name: "_vercel.kings.com", value: "vc-domain-verify=abc" },
  ]);
});

test("add: apex also adds www redirecting to it; an existing domain is fine", async () => {
  const f = fake(json({ name: "kings.com" }), json({ error: { code: "domain_already_in_use" } }, 409));
  await addProjectDomain("kings.com", f.deps);
  assert.equal(f.calls[0].url, "https://api.vercel.com/v10/projects/prj_1/domains?teamId=team_1");
  assert.equal(f.calls[0].method, "POST");
  assert.equal(f.calls[0].auth, "Bearer t");
  assert.deepEqual(f.calls[0].body, { name: "kings.com" });
  assert.deepEqual(f.calls[1].body, { name: "www.kings.com", redirect: "kings.com", redirectStatusCode: 308 });
});

test("add: a real failure throws with Vercel's message", async () => {
  const f = fake(json({ error: { code: "forbidden", message: "Not allowed" } }, 403));
  await assert.rejects(addProjectDomain("kings.com", f.deps), /Not allowed/);
});

test("state: verified + not misconfigured", async () => {
  const f = fake(json({ name: "kings.com", verified: true, verification: [] }), json({ misconfigured: false }));
  const s = await getDomainState("kings.com", f.deps);
  assert.equal(s.configured, true);
  assert.equal(s.verified, true);
  assert.equal(s.misconfigured, false);
  assert.match(f.calls[0].url, /\/v9\/projects\/prj_1\/domains\/kings\.com\?teamId=team_1$/);
  assert.match(f.calls[1].url, /\/v6\/domains\/kings\.com\/config\?teamId=team_1$/);
});

test("state without Vercel configured", async () => {
  const s = await getDomainState("kings.com", { env: {} });
  assert.deepEqual(s, { configured: false, verified: false, misconfigured: true, records: dnsRecordsFor("kings.com", []) });
});

test("remove: deletes apex and its www; a missing domain is fine", async () => {
  const f = fake(json({}), json({ error: { code: "not_found" } }, 404));
  await removeProjectDomain("kings.com", f.deps);
  assert.equal(f.calls[0].method, "DELETE");
  assert.match(f.calls[1].url, /domains\/www\.kings\.com/);
});
```

- [ ] **Step 2: Run** — Expected: FAIL (module missing).

- [ ] **Step 3: Create `src/lib/vercelDomains.server.ts`**

```ts
// Custom domains on the Vercel project that serves every site. Optional: without VERCEL_TOKEN and
// VERCEL_PROJECT_ID the admin keeps the manual flow. Relative imports only (unit-tested).

type Env = Record<string, string | undefined>;
export type VercelDeps = { fetch?: typeof fetch; env?: Env };
export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string };
export type DomainState = { configured: boolean; verified: boolean; misconfigured: boolean; records: DnsRecord[] };

const API = "https://api.vercel.com";
const APEX_IP = "76.76.21.21";
const CNAME_TARGET = "cname.vercel-dns.com";
// Country suffixes where the registrable domain has three labels (kings.com.ng).
const SECOND_LEVEL = new Set(["com.ng", "org.ng", "net.ng", "edu.ng", "gov.ng", "co.uk", "org.uk", "com.gh", "co.ke", "co.za", "com.au"]);

export function vercelConfigured(env: Env = process.env): boolean {
  return Boolean(env.VERCEL_TOKEN && env.VERCEL_PROJECT_ID);
}

export function isApexDomain(name: string): boolean {
  const labels = name.toLowerCase().split(".");
  const suffix2 = labels.slice(-2).join(".");
  return labels.length === (SECOND_LEVEL.has(suffix2) ? 3 : 2);
}

export function dnsRecordsFor(name: string, verification: Array<{ type: string; domain: string; value: string }>): DnsRecord[] {
  const records: DnsRecord[] = isApexDomain(name)
    ? [
        { type: "A", name: "@", value: APEX_IP },
        { type: "CNAME", name: "www", value: CNAME_TARGET },
      ]
    : [{ type: "CNAME", name: name.split(".")[0]!, value: CNAME_TARGET }];
  for (const v of verification) {
    if (v.type === "TXT") records.push({ type: "TXT", name: v.domain, value: v.value });
  }
  return records;
}

async function call(path: string, init: { method?: string; body?: unknown }, deps: VercelDeps) {
  const env = deps.env ?? process.env;
  const f = deps.fetch ?? fetch;
  const team = env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : "";
  const res = await f(`${API}${path}${team}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}`, "Content-Type": "application/json" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { code?: string; message?: string } };
  return { ok: res.ok, status: res.status, data };
}

function fail(r: { status: number; data: { error?: { message?: string } } }): never {
  throw new Error(r.data.error?.message || `Vercel request failed (${r.status}).`);
}

const projectDomains = (env: Env) => `/v10/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID ?? "")}/domains`;
const projectDomain = (env: Env, name: string) => `/v9/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID ?? "")}/domains/${encodeURIComponent(name)}`;
const ALREADY = new Set(["domain_already_in_use", "domain_already_exists"]);

export async function addProjectDomain(name: string, deps: VercelDeps = {}): Promise<void> {
  const env = deps.env ?? process.env;
  const bodies: Array<Record<string, unknown>> = [{ name }];
  if (isApexDomain(name)) bodies.push({ name: `www.${name}`, redirect: name, redirectStatusCode: 308 });
  for (const body of bodies) {
    const r = await call(projectDomains(env), { method: "POST", body }, deps);
    if (!r.ok && !(r.status === 409 && ALREADY.has(r.data.error?.code ?? ""))) fail(r);
  }
}

export async function getDomainState(name: string, deps: VercelDeps = {}): Promise<DomainState> {
  const env = deps.env ?? process.env;
  if (!vercelConfigured(env)) return { configured: false, verified: false, misconfigured: true, records: dnsRecordsFor(name, []) };
  const domain = await call(projectDomain(env, name), {}, deps);
  if (!domain.ok) fail(domain);
  const config = await call(`/v6/domains/${encodeURIComponent(name)}/config`, {}, deps);
  const verification = (domain.data.verification ?? []) as Array<{ type: string; domain: string; value: string }>;
  return {
    configured: true,
    verified: domain.data.verified === true,
    misconfigured: config.ok ? config.data.misconfigured !== false : true,
    records: dnsRecordsFor(name, verification),
  };
}

export async function removeProjectDomain(name: string, deps: VercelDeps = {}): Promise<void> {
  const env = deps.env ?? process.env;
  const names = isApexDomain(name) ? [name, `www.${name}`] : [name];
  for (const n of names) {
    const r = await call(projectDomain(env, n), { method: "DELETE" }, deps);
    if (!r.ok && r.status !== 404) fail(r);
  }
}
```

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Create `src/app/api/admin/sites/[siteId]/domains/route.ts`**

```ts
import { NextResponse } from "next/server";

import { normalizeHostname } from "@/lib/domains";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";
import { addProjectDomain, getDomainState, removeProjectDomain, vercelConfigured } from "@/lib/vercelDomains.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };
const HOST_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

async function domainRow(siteId: string, id: string | null) {
  if (!id) return null;
  const { data } = await supabaseService().from("domains").select("id, hostname, status, created_at").eq("id", id).eq("site_id", siteId).maybeSingle();
  return data as { id: string; hostname: string; status: string; created_at: string } | null;
}

// Add: row (pending) + Vercel project domain.
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`domains:${auth.userId}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { hostname?: string };
  const hostname = normalizeHostname(body.hostname ?? "");
  if (!HOST_RE.test(hostname)) return NextResponse.json({ error: "Enter a domain like kingsbakery.com." }, { status: 400 });

  const { data, error } = await supabaseService()
    .from("domains")
    .insert({ site_id: siteId, hostname, status: "pending" })
    .select("id, hostname, status, created_at")
    .single();
  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json({ error: taken ? "Domain already exists." : error.message }, { status: taken ? 409 : 500 });
  }
  try {
    if (vercelConfigured()) await addProjectDomain(hostname);
  } catch (e) {
    await supabaseService().from("domains").delete().eq("id", data.id);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Vercel refused the domain." }, { status: 502 });
  }
  return NextResponse.json({ domain: data, state: await getDomainState(hostname).catch(() => null) });
}

// Check DNS; marks the row active once Vercel has it verified and pointing at us.
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const row = await domainRow(siteId, new URL(req.url).searchParams.get("id"));
  if (!row) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  try {
    const state = await getDomainState(row.hostname);
    let status = row.status;
    if (state.configured && state.verified && !state.misconfigured && row.status === "pending") {
      await supabaseService().from("domains").update({ status: "active" }).eq("id", row.id);
      status = "active";
    }
    return NextResponse.json({ domain: { ...row, status }, state });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not reach Vercel." }, { status: 502 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const row = await domainRow(siteId, new URL(req.url).searchParams.get("id"));
  if (!row) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  try {
    if (vercelConfigured()) await removeProjectDomain(row.hostname);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not remove it from Vercel." }, { status: 502 });
  }
  await supabaseService().from("domains").delete().eq("id", row.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Update `DomainsSection.tsx`**

Add near the top of the file (after the imports):

```tsx
import type { DomainState } from "@/lib/vercelDomains.server";
import { supabaseBrowser } from "@/lib/supabase/browser";

async function domainsApi(siteId: string, method: "GET" | "POST" | "DELETE", opts: { id?: string; hostname?: string } = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const qs = opts.id ? `?id=${encodeURIComponent(opts.id)}` : "";
  const res = await fetch(`/api/admin/sites/${siteId}/domains${qs}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    ...(method === "POST" ? { body: JSON.stringify({ hostname: opts.hostname }) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; domain?: DomainRow; state?: DomainState | null };
  if (!res.ok) throw new Error(json.error ?? "Request failed.");
  return json;
}
```

(`import type` from a `.server.ts` file is erased at compile time, so no server code reaches the browser.)

Inside the component, add state:

```tsx
  const [states, setStates] = useState<Record<string, DomainState | null>>({});
```

Replace the body of `onAddDomain`'s `try { … }` with:

```tsx
      const res = await domainsApi(siteId, "POST", { hostname: normalized });
      if (res.domain) {
        const created = res.domain;
        setDomains((prev) => [created, ...prev]);
        setStates((prev) => ({ ...prev, [created.id]: res.state ?? null }));
      }
      setDomainHostname("");
```

and its `catch` with:

```tsx
    } catch (err: unknown) {
      setDomainError(err instanceof Error ? err.message : formatSupabaseError(err));
```

Add these handlers next to `onSetDomainStatus`:

```tsx
  async function onCheckDomain(domainId: string) {
    setDomainError(null);
    setDomainActionLoadingId(domainId);
    try {
      const res = await domainsApi(siteId, "GET", { id: domainId });
      setStates((prev) => ({ ...prev, [domainId]: res.state ?? null }));
      if (res.domain) setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, status: res.domain!.status } : d)));
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Check failed.");
    } finally {
      setDomainActionLoadingId(null);
    }
  }

  async function onRemoveDomain(domainId: string) {
    if (!window.confirm("Remove this domain? The site stops answering on it.")) return;
    setDomainError(null);
    setDomainActionLoadingId(domainId);
    try {
      await domainsApi(siteId, "DELETE", { id: domainId });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setDomainActionLoadingId(null);
    }
  }
```

In the JSX that renders each domain row (the existing `domains.map((d) => …)` list below the error box), add next to the existing status buttons:

```tsx
                <button
                  type="button"
                  onClick={() => onCheckDomain(d.id)}
                  disabled={domainActionLoadingId === d.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 disabled:opacity-60"
                >
                  {domainActionLoadingId === d.id ? "Checking…" : "Check DNS"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveDomain(d.id)}
                  disabled={domainActionLoadingId === d.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
                >
                  Remove
                </button>
```

and directly below that row's main line, the DNS instructions when a state is known:

```tsx
              {states[d.id] ? (
                <div className="mt-2 rounded-2xl bg-koi-paper p-3 text-xs text-koi-ink/80">
                  <div className="font-semibold">
                    {d.status === "active"
                      ? "Live — HTTPS is issued automatically."
                      : states[d.id]!.configured
                        ? states[d.id]!.misconfigured
                          ? "Waiting for DNS. Add these records at the domain's registrar, then Check DNS again:"
                          : "DNS found — verifying…"
                        : "Vercel is not connected: add these records, add the domain in Vercel by hand, then mark it Active."}
                  </div>
                  {d.status !== "active" ? (
                    <table className="mt-2 w-full font-mono">
                      <tbody>
                        {states[d.id]!.records.map((r) => (
                          <tr key={`${r.type}${r.name}`}>
                            <td className="pr-3">{r.type}</td>
                            <td className="pr-3">{r.name}</td>
                            <td className="break-all">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              ) : null}
```

Update the "Custom domain (per site)" help text to: `Add the client's domain below, set the DNS records shown, then press Check DNS. It goes live by itself once DNS is right.`

- [ ] **Step 7: README** — in the `.env.local` block add:

```bash
# Custom domains (optional; without these, domains are added to Vercel by hand)
# VERCEL_TOKEN=...                     # vercel.com/account/tokens, scoped to the team
# VERCEL_PROJECT_ID=prj_...            # Project → Settings → General
# VERCEL_TEAM_ID=team_...              # only when the project belongs to a team
```

- [ ] **Step 8: Verify** — unit tests pass. With Vercel env set, add a real test domain from an admin site page: rows shows DNS records; after DNS is set, Check DNS flips it to Active. Without env: add still works (row pending) and shows the "Vercel is not connected" note.

- [ ] **Step 9: Run** `npm test && npm run lint && npm run typecheck`, then commit:

```bash
git add src/lib/vercelDomains.server.ts "src/app/api/admin/sites/[siteId]/domains/route.ts" src/components/admin/site/DomainsSection.tsx tests/vercelDomains.test.mjs README.md
git commit -m "Domains: add, check and remove custom domains on Vercel from the admin"
```

---

## After all tasks

- [ ] Run `npm run eval:assistant` against the production keys; record the score in the PR/commit message. Must be ≥ 85%.
- [ ] Ask the user to run migrations 017, 018, 019 in Supabase and set: paid AI key, Supabase SMTP + redirect URL, `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` (/ `VERCEL_TEAM_ID`) in Vercel env.
- [ ] Push to `origin main`; confirm the CI run is green.
