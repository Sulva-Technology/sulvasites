import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShopPath, shopViewExists, shopPath } from "../src/lib/shop/shopPath.ts";
import { mapShopRows } from "../src/lib/shop/mapShopRows.ts";
import { verifyOrder, pollOrder, parseOrderStatus, isFinalPayment } from "../src/lib/shop/verifyClient.ts";
import { startCheckout } from "../src/lib/shop/checkoutClient.ts";

const REF = "SV-0ABCDE-XYZ789";

test("parseShopPath maps segments to views", () => {
  assert.deepEqual(parseShopPath(undefined), { kind: "list" });
  assert.deepEqual(parseShopPath([]), { kind: "list" });
  assert.deepEqual(parseShopPath(["cart"]), { kind: "cart" });
  assert.deepEqual(parseShopPath(["checkout"]), { kind: "checkout" });
  assert.deepEqual(parseShopPath(["c", "shoes"]), { kind: "category", slug: "shoes" });
  assert.deepEqual(parseShopPath(["red-dress"]), { kind: "product", slug: "red-dress" });
  assert.deepEqual(parseShopPath(["order", REF]), { kind: "order", reference: REF });
});

test("parseShopPath rejects malformed paths", () => {
  for (const p of [["order"], ["order", "nope"], ["c"], ["c", "A B"], ["Red"], ["a", "b", "c"], ["%E0%A4%A"], ["x", "y"], ["order", REF, "x"], ["c", "x", "y"]]) {
    assert.equal(parseShopPath(p), null, JSON.stringify(p));
  }
});

test("shopPath round-trips", () => {
  for (const v of [{ kind: "list" }, { kind: "cart" }, { kind: "checkout" }, { kind: "category", slug: "a-b" }, { kind: "product", slug: "p1" }, { kind: "order", reference: REF }]) {
    assert.deepEqual(parseShopPath(shopPath(v).split("/").slice(2)), v);
  }
});

const rows = () => ({
  siteId: "s1",
  settings: { delivery_fee_kobo: "150000", pickup_enabled: true, pickup_note: " " },
  categories: [{ id: "c2", slug: "b", name: "B", position: 2 }, { id: "c1", slug: "a", name: "A", position: 1 }, { id: "bad" }],
  products: [
    { id: "p1", slug: "one", name: "One", price_kobo: 500000, compare_at_kobo: null, images: [{ url: "https://x/y.jpg", alt: "y" }, "https://x/z.jpg", {}], category_id: "c1", featured: true, position: 2 },
    { id: "p2", slug: "two", name: "Two", price_kobo: "abc", position: 1 },
    { id: "p3", slug: "three", name: "Three", price_kobo: 100, position: 1, description: "d" },
  ],
  variants: [
    { id: "v2", product_id: "p1", options: { Size: "L", n: 3 }, price_kobo: null, stock: 0, position: 2 },
    { id: "v1", product_id: "p1", options: { Size: "S" }, price_kobo: 600000, stock: null, sku: "S1", position: 1 },
  ],
});

test("mapShopRows normalises rows, drops unparseable ones, sorts", () => {
  const d = mapShopRows(rows());
  assert.equal(d.settings.deliveryFeeKobo, 150000);
  assert.equal(d.settings.pickupNote, null);
  assert.deepEqual(d.categories.map((c) => c.slug), ["a", "b"]);
  assert.deepEqual(d.products.map((p) => p.slug), ["three", "one"]); // "two" has a bad price
  const one = d.products[1];
  assert.deepEqual(one.images.map((i) => i.url), ["https://x/y.jpg", "https://x/z.jpg"]);
  assert.deepEqual(one.variants.map((v) => v.id), ["v1", "v2"]);
  assert.deepEqual(one.variants[1].options, { Size: "L" });
  assert.equal(one.variants[0].priceKobo, 600000);
  assert.equal(one.variants[1].stock, 0);
  assert.equal(one.variants[0].stock, null);
});

test("shopViewExists checks category/product only", () => {
  const d = mapShopRows(rows());
  assert.equal(shopViewExists(d, { kind: "category", slug: "a" }), true);
  assert.equal(shopViewExists(d, { kind: "category", slug: "zz" }), false);
  assert.equal(shopViewExists(d, { kind: "product", slug: "one" }), true);
  assert.equal(shopViewExists(d, { kind: "product", slug: "two" }), false);
  assert.equal(shopViewExists(d, { kind: "cart" }), true);
});

const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const order = (payment) => ({
  reference: REF, payment, status: "paid", firstName: "Ada", deliveryMethod: "pickup",
  subtotalKobo: 100, deliveryKobo: 0, totalKobo: 100,
  items: [{ name: "X", variantLabel: null, unitKobo: 100, quantity: 1, lineTotalKobo: 100 }],
});

test("parseOrderStatus accepts all payment states and rejects unknown", () => {
  for (const p of ["paid", "pending", "failed", "cancelled", "refund_pending"]) {
    assert.equal(parseOrderStatus(order(p))?.payment, p);
  }
  assert.equal(parseOrderStatus(order("weird")), null);
  assert.equal(parseOrderStatus(null), null);
  assert.equal(isFinalPayment("pending"), false);
  assert.equal(isFinalPayment("refund_pending"), true);
});

test("verifyOrder maps 404 / 500 / network / ok", async () => {
  const calls = [];
  const f = (r) => async (url) => { calls.push(url); if (r instanceof Error) throw r; return r; };
  assert.equal((await verifyOrder("S", REF, f(resp(404, {})))).notFound, true);
  const e = await verifyOrder("S", REF, f(resp(500, {})));
  assert.equal(e.ok, false);
  assert.equal(e.notFound, false);
  assert.equal((await verifyOrder("S", REF, f(new Error("x")))).ok, false);
  const ok = await verifyOrder("S", REF, f(resp(200, order("paid"))));
  assert.equal(ok.ok, true);
  assert.equal(calls[0], `/api/shop/S/orders/${REF}/verify`);
});

test("pollOrder polls until final, stops on 404, gives up after max", async () => {
  const sleep = async () => {};
  let n = 0;
  const seq = ["pending", "pending", "paid"];
  const f = async () => resp(200, order(seq[n++]));
  const r = await pollOrder("S", REF, { fetch: f, sleep, maxAttempts: 10 });
  assert.equal(r.order.payment, "paid");
  assert.equal(n, 3);

  n = 0;
  const g = async () => { n++; return resp(404, {}); };
  assert.equal((await pollOrder("S", REF, { fetch: g, sleep })).notFound, true);
  assert.equal(n, 1);

  n = 0;
  const h = async () => { n++; return resp(200, order("pending")); };
  const last = await pollOrder("S", REF, { fetch: h, sleep, maxAttempts: 4 });
  assert.equal(last.order.payment, "pending");
  assert.equal(n, 4);

  n = 0;
  const flaky = async () => { n++; return n === 1 ? resp(500, {}) : resp(200, order("failed")); };
  assert.equal((await pollOrder("S", REF, { fetch: flaky, sleep })).order.payment, "failed");

  const ac = new AbortController();
  ac.abort();
  assert.equal(await pollOrder("S", REF, { fetch: h, sleep, signal: ac.signal }), null);
});

test("startCheckout sends returnUrl and redirects only to https", async () => {
  let sent;
  let assigned;
  const env = (r) => ({
    href: "https://shop.example/shop/checkout",
    assign: (u) => { assigned = u; },
    fetch: async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return r; },
  });
  const payload = { lines: [], customer: { name: "A", email: "a@b.co", phone: "1" }, deliveryMethod: "pickup" };

  const ok = await startCheckout("S", payload, env(resp(200, { authorizationUrl: "https://checkout.paystack.com/abc", reference: REF })));
  assert.equal(ok.ok, true);
  assert.equal(sent.url, "/api/shop/S/checkout");
  assert.equal(sent.body.returnUrl, "https://shop.example/shop/checkout");
  assert.equal(assigned, "https://checkout.paystack.com/abc");

  assigned = undefined;
  const bad = await startCheckout("S", payload, env(resp(200, { authorizationUrl: "javascript:alert(1)", reference: REF })));
  assert.equal(bad.ok, false);
  assert.equal(assigned, undefined);

  const conflict = await startCheckout("S", payload, env(resp(409, { error: "changed", problems: [{ lineIndex: 0, reason: "out_of_stock" }] })));
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error, "changed");
  assert.equal(conflict.problems.length, 1);

  const net = await startCheckout("S", payload, { ...env(null), fetch: async () => { throw new Error("x"); } });
  assert.equal(net.ok, false);
});
