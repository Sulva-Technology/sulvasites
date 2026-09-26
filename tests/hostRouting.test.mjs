import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeHost, rewritePathForHost } from "../src/lib/hostRouting.ts";

const P = "soothecontrols.site";

test("normalizeHost strips port, www, case", () => {
  assert.equal(normalizeHost("WWW.Client.com:443"), "client.com");
  assert.equal(normalizeHost("  "), "");
});

test("subdomain rewrites to /<slug>", () => {
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/", P), "/bakery/");
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/about", P), "/bakery/about");
  assert.equal(rewritePathForHost("www.bakery.soothecontrols.site", "/p/pricing", P), "/bakery/p/pricing");
});

test("custom domain rewrites to /d/<host>", () => {
  assert.equal(rewritePathForHost("www.client.com", "/contact", P), "/d/client.com/contact");
});

test("platform root, localhost, vercel previews untouched", () => {
  assert.equal(rewritePathForHost("soothecontrols.site", "/", P), null);
  assert.equal(rewritePathForHost("localhost:3000", "/bakery", P), null);
  assert.equal(rewritePathForHost("app-git-x.vercel.app", "/", P), null);
});

test("bypass paths untouched on any host", () => {
  for (const path of ["/api/ai/generate-site", "/admin", "/login", "/_next/x", "/d/x.com", "/favicon.ico"]) {
    assert.equal(rewritePathForHost("client.com", path, P), null, path);
  }
});
