import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInboxBody, spamScore, isValidEmail } from "../src/lib/inbox/input.ts";
import { buildInboxPayload } from "../src/lib/inbox/clientPayload.ts";
import { buildNotification, isNotifiable } from "../src/lib/inbox/notify.ts";
import { replyLinks, INBOX_STATUSES } from "../src/lib/inbox/status.ts";

const good = () => ({
  kind: "enquiry",
  fields: { name: "  Ada  Obi ", email: " Ada@Example.com ", phone: "+234 801-234 5678", message: "Hello there" },
  sourcePage: "/contact",
});

test("valid enquiry parses and normalises", () => {
  const r = parseInboxBody(good());
  assert.ok(r.ok);
  assert.equal(r.value.name, "Ada Obi");
  assert.equal(r.value.email, "ada@example.com");
  assert.equal(r.value.phone, "+234 801-234 5678");
  assert.equal(r.value.kind, "enquiry");
  assert.equal(r.value.honeypot, false);
  assert.equal(r.value.sourcePage, "/contact");
});

test("extra fields collected, consent dropped, notes/details map to message", () => {
  const r = parseInboxBody({
    kind: "booking",
    fields: { name: "Bo", phone: "08012345678", notes: "Window seat", date: "2026-11-01", time: "Evening", guests: "4", consent: "on", service: "" },
  });
  assert.ok(r.ok);
  assert.equal(r.value.message, "Window seat");
  assert.deepEqual(r.value.extra, { date: "2026-11-01", time: "Evening", guests: "4" });
});

test("missing name, contact, message, bad email/phone rejected", () => {
  const f = (x) => parseInboxBody({ kind: "enquiry", fields: { name: "A", email: "a@b.co", message: "hi", ...x } });
  assert.equal(f({ name: " " }).ok, false);
  assert.equal(f({ email: "nope" }).ok, false);
  assert.equal(f({ email: "", phone: "" }).ok, false);
  assert.equal(f({ phone: "12" }).ok, false);
  assert.equal(f({ message: "" }).ok, false);
  assert.equal(f({ name: "x".repeat(121) }).ok, false);
  assert.equal(f({ message: "x".repeat(4001) }).ok, false);
  assert.equal(f({ email: "a@b.co\nbcc:x@y.z" }).ok, false);
});

test("booking may omit message", () => {
  assert.ok(parseInboxBody({ kind: "booking", fields: { name: "A", phone: "08012345678" } }).ok);
});

test("strict shape: unknown top-level keys, bad types, bad keys rejected", () => {
  assert.equal(parseInboxBody(null).ok, false);
  assert.equal(parseInboxBody([]).ok, false);
  assert.equal(parseInboxBody({ ...good(), site_id: "x" }).ok, false);
  assert.equal(parseInboxBody({ ...good(), kind: "spam" }).ok, false);
  assert.equal(parseInboxBody({ ...good(), fields: { ...good().fields, age: 4 } }).ok, false);
  assert.equal(parseInboxBody({ ...good(), fields: { ...good().fields, "Bad Key": "x" } }).ok, false);
  assert.equal(parseInboxBody({ ...good(), fields: { ...good().fields, __proto__x: "x" } }).ok, false);
  const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, "v"]));
  assert.equal(parseInboxBody({ ...good(), fields: { ...good().fields, ...many } }).ok, false);
  assert.equal(parseInboxBody({ ...good(), sourcePage: "x".repeat(300) }).ok, false);
});

test("honeypot flagged when website filled", () => {
  const r = parseInboxBody({ ...good(), website: "http://spam.example" });
  assert.ok(r.ok);
  assert.equal(r.value.honeypot, true);
});

test("control chars stripped; error messages never echo input", () => {
  const r = parseInboxBody({ ...good(), fields: { ...good().fields, name: "Ada\u0000\u0007 Obi" } });
  assert.ok(r.ok);
  assert.equal(r.value.name, "Ada Obi");
  const bad = parseInboxBody({ ...good(), fields: { ...good().fields, email: "secret-token@@" } });
  assert.equal(bad.ok, false);
  assert.ok(!bad.error.includes("secret"));
});

test("isValidEmail", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("a b@c.co"), false);
  assert.equal(isValidEmail("a@b"), false);
  assert.equal(isValidEmail(`${"a".repeat(250)}@b.co`), false);
});

test("spamScore", () => {
  assert.equal(spamScore({ name: "Ada", message: "Can I book Friday?" }), 0);
  assert.ok(spamScore({ name: "Ada", message: "see http://a.example and https://b.example" }) >= 4);
  assert.ok(spamScore({ name: "http://x.example", message: "hi" }) >= 3);
  assert.ok(spamScore({ name: "Ada", message: "<a href=x>buy</a>" }) >= 2);
});

test("client payload: kind from date, honeypot split, consent kept out", () => {
  const p = buildInboxPayload([["name", "A"], ["date", "2026-11-01"], ["website", ""], ["message", "x"]], "/contact");
  assert.equal(p.kind, "booking");
  assert.equal(p.website, "");
  assert.deepEqual(p.fields, { name: "A", date: "2026-11-01", message: "x" });
  assert.equal(p.sourcePage, "/contact");
  assert.equal(buildInboxPayload([["name", "A"]], "").kind, "enquiry");
});

test("notification escapes html and strips subject newlines", () => {
  const n = buildNotification({
    siteName: "Cafe\nBad", kind: "booking", name: "<b>Ada</b>", email: "a@b.co", phone: null,
    message: "<script>x</script>", extra: { date: "2026-11-01" }, dashboardUrl: "https://app.example/dashboard/1/inbox",
  });
  assert.ok(!n.subject.includes("\n"));
  assert.ok(!n.html.includes("<script>"));
  assert.ok(n.html.includes("&lt;b&gt;Ada"));
  assert.ok(n.text.includes("2026-11-01"));
  assert.ok(n.text.includes("https://app.example/dashboard/1/inbox"));
});

test("isNotifiable needs key, from and valid recipient", () => {
  assert.equal(isNotifiable({ apiKey: "k", from: "a@b.co", to: "x@y.co" }), true);
  assert.equal(isNotifiable({ apiKey: "", from: "a@b.co", to: "x@y.co" }), false);
  assert.equal(isNotifiable({ apiKey: "k", from: "", to: "x@y.co" }), false);
  assert.equal(isNotifiable({ apiKey: "k", from: "a@b.co", to: null }), false);
  assert.equal(isNotifiable({ apiKey: "k", from: "a@b.co", to: "bad" }), false);
});

test("reply links", () => {
  const l = replyLinks({ name: "Ada", email: "a@b.co", phone: "+234 801 234 5678", kind: "enquiry" }, "Cafe");
  assert.ok(l.mailto.startsWith("mailto:a@b.co?subject="));
  assert.equal(l.tel, "tel:+2348012345678");
  assert.equal(l.whatsapp, "https://wa.me/2348012345678");
  const none = replyLinks({ name: "Ada", email: null, phone: null, kind: "booking" }, "Cafe");
  assert.equal(none.mailto, null);
  assert.equal(none.whatsapp, null);
  assert.deepEqual([...INBOX_STATUSES], ["new", "read", "replied", "archived"]);
});
