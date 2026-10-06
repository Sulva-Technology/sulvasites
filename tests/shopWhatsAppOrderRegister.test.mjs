import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWhatsAppOrderBody } from "../src/lib/shop/whatsappOrderInput.ts";
import { buildCreateWhatsAppOrderArgs } from "../src/lib/shop/createOrderArgs.ts";
import { registerWhatsAppOrder, REUSE_MS } from "../src/lib/shop/whatsappOrderClient.ts";
import { buildWhatsAppOrderMessage } from "../src/lib/shop/whatsappOrder.ts";

const P = "11111111-1111-4111-8111-111111111111";
const lines = [{ productId: P, variantId: null, quantity: 2 }];

test("bag request: no details, no delivery method", () => {
  const r = parseWhatsAppOrderBody({ lines });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    lines, deliveryMethod: null, customer: { name: "", email: "", phone: "" }, address: null, notes: null,
  });
});

test("half-typed details are dropped, not rejected", () => {
  const r = parseWhatsAppOrderBody({
    lines, deliveryMethod: "delivery",
    customer: { name: "Tolu Ade", email: "tolu@", phone: "0803 000 0000" }, address: " 7 Akin St ", notes: "x".repeat(501),
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.customer, { name: "Tolu Ade", email: "", phone: "08030000000" });
  assert.equal(r.value.address, "7 Akin St");
  assert.equal(r.value.notes, null);
});

test("pickup drops the address; bad method and bad lines are rejected", () => {
  assert.equal(parseWhatsAppOrderBody({ lines, deliveryMethod: "pickup", address: "x" }).value.address, null);
  assert.equal(parseWhatsAppOrderBody({ lines, deliveryMethod: "drone" }).ok, false);
  assert.equal(parseWhatsAppOrderBody({ lines: [] }).ok, false);
  assert.equal(parseWhatsAppOrderBody(null).ok, false);
});

test("create_whatsapp_order args omit payment fields", () => {
  const args = buildCreateWhatsAppOrderArgs({
    siteId: "s", reference: "SV-1", customer: { name: "", email: "", phone: "" }, deliveryMethod: "delivery",
    address: null, notes: null,
    priced: { items: [{ lineIndex: 0, productId: P, variantId: null, name: "Tote", variantLabel: null, unitKobo: 100, quantity: 2, lineTotalKobo: 200 }],
      subtotalKobo: 200, deliveryKobo: 50, totalKobo: 250 },
  });
  assert.equal("p_payment_mode" in args, false);
  assert.equal("p_key_ref" in args, false);
  assert.equal(args.p_total_kobo, 250);
  assert.equal(args.p_items[0].line_total_kobo, 200);
});

const ORDER = {
  reference: "SV-ABC123-XYZ789", deliveryMethod: null, subtotalKobo: 200, deliveryKobo: 0, totalKobo: 200,
  items: [{ productId: P, name: "Tote", variantLabel: null, unitKobo: 100, quantity: 2, lineTotalKobo: 200 }],
};

function env({ status = 200, body = ORDER, now = 1000 } = {}) {
  const store = new Map();
  const calls = [];
  return {
    calls, store,
    env: {
      fetch: async (url, init) => {
        calls.push({ url, body: init.body });
        return { ok: status < 400, json: async () => body };
      },
      storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
      now: () => now,
      timeoutMs: 1000,
    },
  };
}

test("registers the order and reuses it for the same bag", async () => {
  const e = env();
  const a = await registerWhatsAppOrder("site-1", { lines }, e.env);
  assert.equal(a.reference, ORDER.reference);
  assert.equal(e.calls[0].url, "/api/shop/site-1/whatsapp-order");
  const b = await registerWhatsAppOrder("site-1", { lines }, e.env);
  assert.equal(b.reference, ORDER.reference);
  assert.equal(e.calls.length, 1, "second tap reuses the order");
  await registerWhatsAppOrder("site-1", { lines: [{ ...lines[0], quantity: 3 }] }, e.env);
  assert.equal(e.calls.length, 2, "a changed bag is a new order");
});

test("reuse expires", async () => {
  const e = env();
  await registerWhatsAppOrder("s", { lines }, e.env);
  e.env.now = () => 1000 + REUSE_MS + 1;
  await registerWhatsAppOrder("s", { lines }, e.env);
  assert.equal(e.calls.length, 2);
});

test("failures return null so WhatsApp still opens", async () => {
  assert.equal(await registerWhatsAppOrder("s", { lines }, env({ status: 409, body: { error: "x" } }).env), null);
  assert.equal(await registerWhatsAppOrder("s", { lines }, env({ body: { reference: "x" } }).env), null);
  const broken = env();
  broken.env.fetch = async () => { throw new Error("offline"); };
  assert.equal(await registerWhatsAppOrder("s", { lines }, broken.env), null);
});

test("message carries the order reference and an undecided delivery", () => {
  const msg = buildWhatsAppOrderMessage({ items: ORDER.items, subtotalKobo: 200, deliveryMethod: "agree", reference: ORDER.reference });
  assert.match(msg, /^Hello, I'd like to place this order:\nOrder ref: SV-ABC123-XYZ789\n/);
  assert.match(msg, /Delivery or pickup: to be agreed/);
  assert.doesNotMatch(msg, /Total:/);
});
