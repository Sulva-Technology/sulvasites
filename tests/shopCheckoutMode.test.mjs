import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardCheckoutOpen, orderWhatsApp, parseCheckoutMode, parseOrdersNumber, whatsAppOrdersOpen,
} from "../src/lib/shop/checkoutMode.ts";
import { mapShopRows } from "../src/lib/shop/mapShopRows.ts";

test("unknown or missing checkout mode falls back to card and WhatsApp", () => {
  assert.equal(parseCheckoutMode(undefined), "card_and_whatsapp");
  assert.equal(parseCheckoutMode("bitcoin"), "card_and_whatsapp");
  assert.equal(parseCheckoutMode("whatsapp"), "whatsapp");
  assert.equal(parseCheckoutMode("card"), "card");
});

test("each mode opens the right channels", () => {
  assert.deepEqual([cardCheckoutOpen("card"), whatsAppOrdersOpen("card")], [true, false]);
  assert.deepEqual([cardCheckoutOpen("card_and_whatsapp"), whatsAppOrdersOpen("card_and_whatsapp")], [true, true]);
  assert.deepEqual([cardCheckoutOpen("whatsapp"), whatsAppOrdersOpen("whatsapp")], [false, true]);
});

test("orders number wins over the profile WhatsApp; card mode hides both", () => {
  const s = (checkoutMode, whatsappNumber = null) => ({ checkoutMode, whatsappNumber });
  assert.equal(orderWhatsApp(s("whatsapp", "+2348030000000"), "0801 111 1111"), "2348030000000");
  assert.equal(orderWhatsApp(s("card_and_whatsapp"), "+234 801 111 1111"), "2348011111111");
  assert.equal(orderWhatsApp(s("card", "+2348030000000"), "08011111111"), null);
  assert.equal(orderWhatsApp(s("whatsapp", "12"), null), null);
  assert.equal(orderWhatsApp(null, "08011111111"), "08011111111");
});

test("orders number input is normalised and validated", () => {
  assert.deepEqual(parseOrdersNumber(" +234 (803) 000-0000 "), { ok: true, value: "+2348030000000" });
  assert.deepEqual(parseOrdersNumber("08030000000"), { ok: true, value: "08030000000" });
  assert.deepEqual(parseOrdersNumber(""), { ok: true, value: null });
  assert.deepEqual(parseOrdersNumber(null), { ok: true, value: null });
  assert.equal(parseOrdersNumber("call me").ok, false);
  assert.equal(parseOrdersNumber("123").ok, false);
  assert.equal(parseOrdersNumber("+1234567890123456").ok, false);
});

test("public shop rows carry checkout mode and orders number", () => {
  const base = { siteId: "s1", categories: [], products: [], variants: [] };
  const legacy = mapShopRows({ ...base, settings: { enabled: true, delivery_fee_kobo: 0, pickup_enabled: false } });
  assert.equal(legacy.settings.checkoutMode, "card_and_whatsapp");
  assert.equal(legacy.settings.whatsappNumber, null);
  const set = mapShopRows({
    ...base,
    settings: { enabled: true, delivery_fee_kobo: 0, checkout_mode: "whatsapp", whatsapp_orders_number: "+2348030000000" },
  });
  assert.equal(set.settings.checkoutMode, "whatsapp");
  assert.equal(set.settings.whatsappNumber, "+2348030000000");
});
