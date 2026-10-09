import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FAILURES,
  RESUBMIT_MS,
  VERIFY_DELAY_MS,
  changedUrls,
  chunk,
  googleSiteUrl,
  initialState,
  latestLastmod,
  nextGoogleStep,
  parseMetaToken,
  stateAfter,
} from "../src/lib/search/searchPlan.ts";

const NOW = Date.parse("2026-10-09T12:00:00Z");
const ago = (ms) => new Date(NOW - ms).toISOString();

function row(over = {}) {
  return {
    host: "client.com",
    kind: "custom",
    google_state: "pending",
    google_state_at: ago(0),
    google_token: null,
    sitemap_submitted_at: null,
    indexnow_pushed_at: null,
    failures: 0,
    ...over,
  };
}

test("initialState: custom domains start pending, platform hosts start added", () => {
  assert.equal(initialState("custom"), "pending");
  assert.equal(initialState("subdomain"), "added");
  assert.equal(initialState("platform"), "added");
});

test("custom domain walks token -> verify -> add -> submit", () => {
  assert.equal(nextGoogleStep(row(), null, NOW), "getToken");
  assert.equal(nextGoogleStep(row({ google_state: "token", google_state_at: ago(VERIFY_DELAY_MS) }), null, NOW), "verify");
  assert.equal(nextGoogleStep(row({ google_state: "verified" }), null, NOW), "add");
  assert.equal(nextGoogleStep(row({ google_state: "added" }), null, NOW), "submitSitemap");
});

test("verify waits until the meta tag has had time to go out", () => {
  assert.equal(nextGoogleStep(row({ google_state: "token", google_state_at: ago(60_000) }), null, NOW), "none");
});

test("subdomains only submit sitemaps", () => {
  assert.equal(nextGoogleStep(row({ kind: "subdomain", google_state: "added" }), null, NOW), "submitSitemap");
});

test("submitted: resubmit only after content changed and a week passed", () => {
  const submitted = row({ google_state: "submitted", sitemap_submitted_at: ago(RESUBMIT_MS + 1) });
  assert.equal(nextGoogleStep(submitted, ago(RESUBMIT_MS + 2), NOW), "none", "no change since submit");
  assert.equal(nextGoogleStep(submitted, ago(1000), NOW), "submitSitemap");
  const recent = row({ google_state: "submitted", sitemap_submitted_at: ago(1000) });
  assert.equal(nextGoogleStep(recent, ago(10), NOW), "none", "within a week");
  assert.equal(nextGoogleStep(row({ google_state: "submitted" }), null, NOW), "submitSitemap", "never submitted");
});

test("failure cap stops Google steps", () => {
  assert.equal(nextGoogleStep(row({ failures: MAX_FAILURES }), null, NOW), "none");
  assert.equal(nextGoogleStep(row({ failures: MAX_FAILURES - 1 }), null, NOW), "getToken");
});

test("stateAfter maps each step to the state it reaches", () => {
  assert.equal(stateAfter("getToken"), "token");
  assert.equal(stateAfter("verify"), "verified");
  assert.equal(stateAfter("add"), "added");
  assert.equal(stateAfter("submitSitemap"), "submitted");
});

test("changedUrls: everything first time, then only newer lastmods", () => {
  const entries = [
    { url: "https://a.com/", lastmod: "2026-10-09T10:00:00Z" },
    { url: "https://a.com/about", lastmod: "2026-10-01T00:00:00Z" },
    { url: "https://a.com/shop" },
  ];
  assert.deepEqual(changedUrls(entries, null), entries.map((e) => e.url));
  assert.deepEqual(changedUrls(entries, "2026-10-05T00:00:00Z"), ["https://a.com/"]);
  assert.deepEqual(changedUrls(entries, "2026-10-09T11:00:00Z"), []);
});

test("latestLastmod picks the newest valid date", () => {
  assert.equal(latestLastmod([{ url: "a", lastmod: "2026-10-01T00:00:00Z" }, { url: "b", lastmod: "2026-10-03T00:00:00Z" }, { url: "c" }]), "2026-10-03T00:00:00.000Z");
  assert.equal(latestLastmod([{ url: "a" }]), null);
});

test("parseMetaToken reads the content attribute", () => {
  assert.equal(parseMetaToken('<meta name="google-site-verification" content="abc_DEF-123" />'), "abc_DEF-123");
  assert.equal(parseMetaToken("<meta name='google-site-verification' content='xyz'>"), "xyz");
  assert.equal(parseMetaToken("<meta name=\"x\">"), null);
});

test("googleSiteUrl: custom domains are URL-prefix properties, the rest use the domain property", () => {
  assert.equal(googleSiteUrl({ host: "client.com", kind: "custom" }, "sc-domain:p.com"), "https://client.com/");
  assert.equal(googleSiteUrl({ host: "a.p.com", kind: "subdomain" }, "sc-domain:p.com"), "sc-domain:p.com");
  assert.equal(googleSiteUrl({ host: "p.com", kind: "platform" }, "sc-domain:p.com"), "sc-domain:p.com");
});

test("chunk splits into fixed-size batches", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});
