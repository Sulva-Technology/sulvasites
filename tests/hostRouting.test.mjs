import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeHost, rewritePathForHost, siteRefForHost, siteScopedRedirect } from "../src/lib/hostRouting.ts";

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

test("shop paths rewrite like any other path (subdomain and custom domain)", () => {
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/shop", P), "/bakery/shop");
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/shop/c/shoes", P), "/bakery/shop/c/shoes");
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/shop/order/SV-ABC123-XYZ789", P), "/bakery/shop/order/SV-ABC123-XYZ789");
  assert.equal(rewritePathForHost("www.client.com", "/shop/cart", P), "/d/client.com/shop/cart");
  assert.equal(rewritePathForHost("client.com", "/shop/red-dress", P), "/d/client.com/shop/red-dress");
  // platform domain keeps path-based /<slug>/shop/...
  assert.equal(rewritePathForHost("soothecontrols.site", "/bakery/shop", P), null);
});

test("bypass paths untouched on any host", () => {
  for (const path of ["/api/ai/generate-site", "/admin", "/login", "/_next/x", "/d/x.com", "/favicon.ico"]) {
    assert.equal(rewritePathForHost("client.com", path, P), null, path);
  }
});

test("owner back-office paths work on the site's own link (subdomain and custom domain)", () => {
  const paths = ["/dashboard", "/dashboard/abc-123/content", "/change-password", "/no-access"];
  for (const host of ["store.soothecontrols.site", "www.client.com"]) {
    for (const path of paths) {
      assert.equal(rewritePathForHost(host, path, P), null, `${host}${path}`);
    }
  }
});

test("siteRefForHost identifies the site a host serves", () => {
  assert.deepEqual(siteRefForHost("loveable.soothecontrols.site", P), { slug: "loveable" });
  assert.deepEqual(siteRefForHost("www.Client.com:443", P), { hostname: "client.com" });
  assert.equal(siteRefForHost("soothecontrols.site", P), null);
  assert.equal(siteRefForHost("localhost:3000", P), null);
  assert.equal(siteRefForHost("app-git-x.vercel.app", P), null);
  // Platform on a nested domain (e.g. sulvasites.sulvatech.com)
  assert.deepEqual(siteRefForHost("loveable.sulvasites.sulvatech.com", "sulvasites.sulvatech.com"), { slug: "loveable" });
  assert.equal(siteRefForHost("sulvasites.sulvatech.com", "sulvasites.sulvatech.com"), null);
});

test("siteScopedRedirect keeps the back office on the host's site", () => {
  const id = "site-1";
  for (const path of ["/admin", "/admin/sites", "/admin/sites/new", "/admin/users", "/admin/templates/t1", "/admin/sites/other/shop"]) {
    assert.equal(siteScopedRedirect(path, id), "/admin/sites/site-1", path);
  }
  for (const path of ["/admin/sites/site-1", "/admin/sites/site-1/shop/orders", "/admin/sites/site-1/preview"]) {
    assert.equal(siteScopedRedirect(path, id), null, path);
  }
  assert.equal(siteScopedRedirect("/dashboard", id), "/dashboard/site-1");
  assert.equal(siteScopedRedirect("/dashboard/other/inbox", id), "/dashboard/site-1");
  assert.equal(siteScopedRedirect("/dashboard/site-1/content", id), null);
  assert.equal(siteScopedRedirect("/admin/sites/site-10", id), "/admin/sites/site-1");
  assert.equal(siteScopedRedirect("/login", id), null);
});

test("forgot-password is served by the app on every host, like login", () => {
  assert.equal(rewritePathForHost("bakery.soothecontrols.site", "/forgot-password", "soothecontrols.site"), null);
  assert.equal(rewritePathForHost("client.com", "/forgot-password", "soothecontrols.site"), null);
});
