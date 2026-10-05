import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePath, parseTrackBody, referrerHost, deviceClass, isBot, hasPrivacySignal, countryFromHeaders,
} from "../src/lib/insights/track.ts";
import { visitorHash, utcDay } from "../src/lib/insights/visitor.ts";
import { TRACK_LIMITS } from "../src/lib/insights/limits.ts";

test("normalizePath", () => {
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("/about?x=1#y"), "/about");
  assert.equal(normalizePath("/about/"), "/about");
  assert.equal(normalizePath("/shop/order/ORD-123"), "/shop/order");
  assert.equal(normalizePath("/shop/order"), "/shop/order");
  assert.equal(normalizePath("/shop/p/red-shirt"), "/shop/p/red-shirt");
  assert.equal(normalizePath("about"), null);
  assert.equal(normalizePath("//evil.com"), null);
  assert.equal(normalizePath("/a\nb"), null);
  assert.equal(normalizePath("/" + "a".repeat(250)), null);
  assert.equal(normalizePath(42), null);
  assert.equal(normalizePath(""), null);
});

test("parseTrackBody", () => {
  assert.deepEqual(parseTrackBody(JSON.stringify({ path: "/menu?a=1", referrer: "https://www.google.com/search?q=x" })), {
    ok: true, value: { path: "/menu", referrer: "https://www.google.com/search?q=x" },
  });
  assert.deepEqual(parseTrackBody('{"path":"/"}'), { ok: true, value: { path: "/", referrer: null } });
  assert.equal(parseTrackBody("not json").ok, false);
  assert.equal(parseTrackBody("[]").ok, false);
  assert.equal(parseTrackBody('{"path":"x"}').ok, false);
  assert.equal(parseTrackBody('{"path":"/","referrer":5}').ok, false);
  assert.equal(parseTrackBody(JSON.stringify({ path: "/", referrer: "h".repeat(400) })).ok, false);
  assert.equal(parseTrackBody("x".repeat(TRACK_LIMITS.maxBodyChars + 1)).ok, false);
});

test("referrerHost", () => {
  assert.equal(referrerHost("https://www.Google.com/search?q=a", "mysite.com"), "google.com");
  assert.equal(referrerHost("https://instagram.com/p/1", null), "instagram.com");
  assert.equal(referrerHost("https://mysite.com/about", "mysite.com"), null);
  assert.equal(referrerHost("https://www.mysite.com/about", "mysite.com:3000"), null);
  assert.equal(referrerHost("android-app://com.google.android.gm", null), null);
  assert.equal(referrerHost("javascript:alert(1)", null), null);
  assert.equal(referrerHost("", null), null);
  assert.equal(referrerHost(null, null), null);
  assert.equal(referrerHost("not a url", null), null);
});

test("deviceClass", () => {
  assert.equal(deviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assert.equal(deviceClass("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537"), "mobile");
  assert.equal(deviceClass("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(deviceClass("Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/120 Safari/537"), "tablet");
  assert.equal(deviceClass("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"), "desktop");
  assert.equal(deviceClass(""), "desktop");
});

test("isBot", () => {
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assert.equal(isBot("Mozilla/5.0 AppleWebKit HeadlessChrome/120"), true);
  assert.equal(isBot("curl/8.0"), true);
  assert.equal(isBot("WhatsApp/2.23"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot(null), true);
  assert.equal(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"), false);
});

test("hasPrivacySignal", () => {
  const h = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });
  assert.equal(hasPrivacySignal(h({ dnt: "1" })), true);
  assert.equal(hasPrivacySignal(h({ "sec-gpc": "1" })), true);
  assert.equal(hasPrivacySignal(h({ dnt: "0" })), false);
  assert.equal(hasPrivacySignal(h({})), false);
});

test("countryFromHeaders", () => {
  const h = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });
  assert.equal(countryFromHeaders(h({ "x-vercel-ip-country": "ng" })), "NG");
  assert.equal(countryFromHeaders(h({ "cf-ipcountry": "GH" })), "GH");
  assert.equal(countryFromHeaders(h({ "cf-ipcountry": "XX" })), null);
  assert.equal(countryFromHeaders(h({ "x-vercel-ip-country": "Nigeria" })), null);
  assert.equal(countryFromHeaders(h({})), null);
});

test("visitorHash is daily-rotating, site-scoped and never raw", () => {
  const a = visitorHash("s3cret", "2026-10-05", "site1", "1.2.3.4", "UA");
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(a, visitorHash("s3cret", "2026-10-05", "site1", "1.2.3.4", "UA"));
  assert.notEqual(a, visitorHash("s3cret", "2026-10-06", "site1", "1.2.3.4", "UA"));
  assert.notEqual(a, visitorHash("s3cret", "2026-10-05", "site2", "1.2.3.4", "UA"));
  assert.notEqual(a, visitorHash("s3cret", "2026-10-05", "site1", "1.2.3.5", "UA"));
  assert.notEqual(a, visitorHash("other", "2026-10-05", "site1", "1.2.3.4", "UA"));
  assert.ok(!a.includes("1.2.3.4"));
});

test("utcDay", () => {
  assert.equal(utcDay(new Date("2026-10-05T23:59:59Z")), "2026-10-05");
  assert.equal(utcDay(new Date("2026-10-06T00:00:00Z")), "2026-10-06");
});
