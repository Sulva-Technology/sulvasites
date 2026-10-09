import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRobotsTxt, buildSitemapXml, siteUrl } from "../src/lib/sitemap.ts";

test("siteUrl joins host and path", () => {
  assert.equal(siteUrl("a.com", ""), "https://a.com/");
  assert.equal(siteUrl("a.com", "/"), "https://a.com/");
  assert.equal(siteUrl("a.com", "/about"), "https://a.com/about");
  assert.equal(siteUrl("a.com", "p/menu"), "https://a.com/p/menu");
});

test("buildSitemapXml escapes URLs and normalises lastmod", () => {
  const xml = buildSitemapXml([
    { url: "https://a.com/?x=1&y=<2>", lastmod: "2026-10-09 10:00:00+00" },
    { url: "https://a.com/it's", lastmod: "not a date" },
  ]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.ok(xml.includes("<loc>https://a.com/?x=1&amp;y=&lt;2&gt;</loc>"));
  assert.ok(xml.includes("<lastmod>2026-10-09T10:00:00.000Z</lastmod>"));
  assert.ok(xml.includes("<loc>https://a.com/it&apos;s</loc>"));
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
});

test("buildSitemapXml with no entries is an empty urlset", () => {
  const xml = buildSitemapXml([]);
  assert.ok(xml.includes("<urlset"));
  assert.ok(xml.includes("</urlset>"));
  assert.ok(!xml.includes("<url>"));
});

test("buildRobotsTxt allow and disallow", () => {
  assert.equal(
    buildRobotsTxt({ allow: true, sitemapUrl: "https://a.com/sitemap.xml" }),
    "User-agent: *\nAllow: /\nDisallow: /dashboard\n\nSitemap: https://a.com/sitemap.xml\n",
  );
  assert.equal(buildRobotsTxt({ allow: false }), "User-agent: *\nDisallow: /\n");
});
