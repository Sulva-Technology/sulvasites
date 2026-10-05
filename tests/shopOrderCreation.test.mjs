import { test } from "node:test";
import assert from "node:assert/strict";
import { keyRefFor, keyRefMatches, PLATFORM_KEY_REF } from "../src/lib/shop/keyIdentity.ts";
import { buildCreateOrderArgs } from "../src/lib/shop/createOrderArgs.ts";

test("keyRefFor: platform or last4 of own secret", () => {
  assert.equal(keyRefFor("platform"), PLATFORM_KEY_REF);
  assert.equal(keyRefFor("platform", "sk_live_zzzz"), "platform");
  assert.equal(keyRefFor("own_keys", "sk_test_abcd1234"), "1234");
  assert.equal(keyRefFor("own_keys", null), "");
});

test("keyRefMatches: legacy null passes, rotation fails", () => {
  assert.equal(keyRefMatches(null, "1234"), true);
  assert.equal(keyRefMatches(undefined, "platform"), true);
  assert.equal(keyRefMatches("", "1234"), true);
  assert.equal(keyRefMatches("1234", "1234"), true);
  assert.equal(keyRefMatches("1234", "9999"), false);
  assert.equal(keyRefMatches("platform", "9999"), false);
});

test("buildCreateOrderArgs maps the priced cart to create_order params", () => {
  const args = buildCreateOrderArgs({
    siteId: "s",
    reference: "R-1",
    customer: { name: "Ada", email: "a@x.com", phone: "08000000000" },
    deliveryMethod: "delivery",
    address: "1 Road",
    notes: null,
    priced: {
      items: [
        { lineIndex: 0, productId: "p", variantId: null, name: "Dress", variantLabel: null, unitKobo: 1000, quantity: 2, lineTotalKobo: 2000 },
      ],
      subtotalKobo: 2000,
      deliveryKobo: 500,
      totalKobo: 2500,
    },
    paymentMode: "own_keys",
    keyRef: "1234",
  });
  assert.equal(args.p_site, "s");
  assert.equal(args.p_total_kobo, 2500);
  assert.equal(args.p_key_ref, "1234");
  assert.deepEqual(args.p_items, [
    { product_id: "p", variant_id: null, name: "Dress", variant_label: null, unit_price_kobo: 1000, quantity: 2, line_total_kobo: 2000 },
  ]);
  assert.equal(buildCreateOrderArgs({ ...{ siteId: "s", reference: "r", customer: { name: "a", email: "e", phone: "p" }, deliveryMethod: "pickup", address: null, notes: null, priced: { items: [], subtotalKobo: 0, deliveryKobo: 0, totalKobo: 0 }, paymentMode: "own_keys" }, keyRef: "" }).p_key_ref, null);
});
