import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckoutBody, parseCartLines } from "../src/lib/shop/checkoutInput.ts";
import { resolveCallbackUrl } from "../src/lib/shop/callbackUrl.ts";

const P1 = "11111111-1111-4111-8111-111111111111";
const V1 = "22222222-2222-4222-8222-222222222222";

const good = () => ({
  lines: [{ productId: P1, variantId: V1, quantity: 2 }],
  customer: { name: "  Ada  Obi ", email: " ada@example.com ", phone: "+234 801-234 5678" },
  deliveryMethod: "delivery",
  address: " 12 Allen Ave, Ikeja ",
  notes: "",
  returnUrl: "https://shop.example.com/shop/checkout",
});

test("valid body parses and normalises", () => {
  const r = parseCheckoutBody(good());
  assert.ok(r.ok);
  assert.equal(r.value.customer.name, "Ada Obi");
  assert.equal(r.value.customer.email, "ada@example.com");
  assert.equal(r.value.customer.phone, "+2348012345678");
  assert.equal(r.value.address, "12 Allen Ave, Ikeja");
  assert.equal(r.value.notes, null);
  assert.equal(r.value.returnUrl, "https://shop.example.com/shop/checkout");
});

test("non-object bodies rejected", () => {
  for (const b of [null, undefined, "x", 5, [], true]) assert.equal(parseCheckoutBody(b).ok, false);
});

test("name bounds", () => {
  for (const name of ["A", "x".repeat(81), "", 5, "bad\u0000name"]) {
    const b = good(); b.customer.name = name; assert.equal(parseCheckoutBody(b).ok, false, String(name));
  }
  const b = good(); b.customer.name = "Al"; assert.ok(parseCheckoutBody(b).ok);
});

test("email validation", () => {
  for (const e of ["", "a", "a@b", "a@b.", "a b@c.com", "<x>@c.com", `${"a".repeat(250)}@c.com`, 7]) {
    const b = good(); b.customer.email = e; assert.equal(parseCheckoutBody(b).ok, false, String(e));
  }
});

test("phone validation", () => {
  for (const p of ["123456", "abc1234567", "+", "1".repeat(21), "", 5]) {
    const b = good(); b.customer.phone = p; assert.equal(parseCheckoutBody(b).ok, false, String(p));
  }
  const b = good(); b.customer.phone = "(0801) 234-5678"; assert.ok(parseCheckoutBody(b).ok);
});

test("delivery requires address, pickup drops it", () => {
  const d = good(); d.address = "  "; assert.equal(parseCheckoutBody(d).ok, false);
  const long = good(); long.address = "x".repeat(301); assert.equal(parseCheckoutBody(long).ok, false);
  const p = good(); p.deliveryMethod = "pickup"; p.address = "ignored";
  const r = parseCheckoutBody(p); assert.ok(r.ok); assert.equal(r.value.address, null);
  const bad = good(); bad.deliveryMethod = "courier"; assert.equal(parseCheckoutBody(bad).ok, false);
});

test("notes limit 500", () => {
  const b = good(); b.notes = "n".repeat(501); assert.equal(parseCheckoutBody(b).ok, false);
  b.notes = "n".repeat(500); assert.ok(parseCheckoutBody(b).ok);
  b.notes = "line1\nline2"; assert.ok(parseCheckoutBody(b).ok);
  b.notes = "bad\u0007bell"; assert.equal(parseCheckoutBody(b).ok, false);
});

test("cart lines: counts, ids, quantity", () => {
  assert.equal(parseCartLines([]).ok, false);
  assert.equal(parseCartLines("x").ok, false);
  const many = Array.from({ length: 51 }, () => ({ productId: P1, variantId: null, quantity: 1 }));
  assert.equal(parseCartLines(many).ok, false);
  assert.ok(parseCartLines(many.slice(0, 50)).ok);
  for (const q of [0, -1, 1.5, 100, Number.NaN, "2", null, Infinity]) {
    assert.equal(parseCartLines([{ productId: P1, variantId: null, quantity: q }]).ok, false, String(q));
  }
  assert.equal(parseCartLines([{ productId: "nope", variantId: null, quantity: 1 }]).ok, false);
  assert.equal(parseCartLines([{ productId: P1, variantId: "x", quantity: 1 }]).ok, false);
  assert.equal(parseCartLines([null]).ok, false);
  const r = parseCartLines([{ productId: P1.toUpperCase(), quantity: 99 }]);
  assert.ok(r.ok); assert.deepEqual(r.value, [{ productId: P1, variantId: null, quantity: 99 }]);
});

test("returnUrl non-string dropped", () => {
  const b = good(); b.returnUrl = { x: 1 };
  const r = parseCheckoutBody(b); assert.ok(r.ok); assert.equal(r.value.returnUrl, null);
});

const base = {
  slug: "acme", reference: "SV-ABC123-XYZ789", platformDomain: "example.site",
  customHosts: ["shop.acme.com"], fallbackOrigin: "https://app.example.org", allowLocal: false,
};
const FB = "https://app.example.org/acme/shop/order/SV-ABC123-XYZ789";

test("callback: site subdomain honoured at root", () => {
  assert.equal(
    resolveCallbackUrl({ ...base, returnUrl: "https://acme.example.site/shop/checkout" }),
    "https://acme.example.site/shop/order/SV-ABC123-XYZ789",
  );
});

test("callback: other site's subdomain not honoured", () => {
  assert.equal(resolveCallbackUrl({ ...base, returnUrl: "https://evil.example.site/shop" }), FB);
});

test("callback: custom domain incl. www honoured", () => {
  assert.equal(
    resolveCallbackUrl({ ...base, returnUrl: "https://www.shop.acme.com/shop/cart" }),
    "https://www.shop.acme.com/shop/order/SV-ABC123-XYZ789",
  );
});

test("callback: foreign host, http downgrade, creds, junk fall back", () => {
  for (const r of ["https://evil.com/x", "http://acme.example.site/x", "https://u:p@acme.example.site/x", "javascript:alert(1)", "not a url", "", null]) {
    assert.equal(resolveCallbackUrl({ ...base, returnUrl: r }), FB, String(r));
  }
});

test("callback: platform domain and fallback origin are path-based", () => {
  assert.equal(
    resolveCallbackUrl({ ...base, returnUrl: "https://example.site/acme/shop/checkout" }),
    "https://example.site/acme/shop/order/SV-ABC123-XYZ789",
  );
  assert.equal(resolveCallbackUrl({ ...base, returnUrl: "https://app.example.org/acme/shop/checkout" }), FB);
});

test("callback: localhost only when allowLocal", () => {
  const r = "http://localhost:3000/acme/shop/checkout";
  assert.equal(resolveCallbackUrl({ ...base, returnUrl: r }), FB);
  assert.equal(
    resolveCallbackUrl({ ...base, returnUrl: r, allowLocal: true }),
    "http://localhost:3000/acme/shop/order/SV-ABC123-XYZ789",
  );
});

test("callback: null when nothing valid and no fallback", () => {
  assert.equal(resolveCallbackUrl({ ...base, fallbackOrigin: null, returnUrl: "https://evil.com" }), null);
  assert.equal(resolveCallbackUrl({ ...base, fallbackOrigin: null, returnUrl: null }), null);
});
