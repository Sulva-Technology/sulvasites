import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppOrderLink, buildWhatsAppOrderMessage, buildWhatsAppProductMessage, whatsAppNumber, WHATSAPP_MAX_ITEMS,
} from "../src/lib/shop/whatsappOrder.ts";

const item = (over = {}) => ({
  name: "Linen Shirt", variantLabel: "M / Sand", quantity: 2, unitKobo: 1500000, lineTotalKobo: 3000000, ...over,
});

test("bag message lists items, quantities and subtotal", () => {
  const msg = buildWhatsAppOrderMessage({ businessName: "Ada Wears", items: [item()], subtotalKobo: 3000000 });
  assert.match(msg, /^Hello Ada Wears, I'd like to place this order:/);
  assert.match(msg, /1\. Linen Shirt \(M \/ Sand\)/);
  assert.match(msg, /2 × ₦15,000 = ₦30,000/);
  assert.match(msg, /Subtotal: ₦30,000/);
  assert.doesNotMatch(msg, /Total:|Delivery:|My details/);
});

test("checkout message adds delivery, total and typed details", () => {
  const msg = buildWhatsAppOrderMessage({
    items: [item()], subtotalKobo: 3000000, deliveryMethod: "delivery", deliveryKobo: 250000,
    customer: { name: " Tolu ", phone: "0803 000 0000", email: "", address: "7 Akin\nAdesola St", notes: null },
  });
  assert.match(msg, /Delivery: ₦2,500\nTotal: ₦32,500/);
  assert.match(msg, /Name: Tolu\nPhone: 0803 000 0000\nAddress: 7 Akin Adesola St/);
  assert.doesNotMatch(msg, /Email:|Notes:/);
});

test("pickup is free and omits the address", () => {
  const msg = buildWhatsAppOrderMessage({
    items: [item()], subtotalKobo: 3000000, deliveryMethod: "pickup", deliveryKobo: 250000,
    customer: { address: "somewhere" },
  });
  assert.match(msg, /Pickup: Free\nTotal: ₦30,000/);
  assert.doesNotMatch(msg, /Address/);
});

test("only http(s) product links are included", () => {
  const ok = buildWhatsAppOrderMessage({ items: [item({ url: "https://shop.ng/shop/linen" })], subtotalKobo: 1 });
  assert.match(ok, /https:\/\/shop\.ng\/shop\/linen/);
  const bad = buildWhatsAppOrderMessage({ items: [item({ url: "javascript:alert(1)" })], subtotalKobo: 1 });
  assert.doesNotMatch(bad, /javascript/);
});

test("long bags are summarised", () => {
  const items = Array.from({ length: WHATSAPP_MAX_ITEMS + 3 }, (_, i) => item({ name: `P${i}` }));
  const msg = buildWhatsAppOrderMessage({ items, subtotalKobo: 0 });
  assert.match(msg, /…and 3 more items/);
  assert.doesNotMatch(msg, new RegExp(`P${WHATSAPP_MAX_ITEMS}\\b`));
});

test("whatsAppNumber keeps digits and rejects junk", () => {
  assert.equal(whatsAppNumber("+234 803-000-0000"), "2348030000000");
  assert.equal(whatsAppNumber("123"), null);
  assert.equal(whatsAppNumber(null), null);
});

test("order link encodes the message for wa.me", () => {
  const link = buildWhatsAppOrderLink("+234 803 000 0000", "Hi & thanks\n#1");
  assert.equal(link, "https://wa.me/2348030000000?text=Hi%20%26%20thanks%0A%231");
  assert.equal(buildWhatsAppOrderLink("", "x"), null);
});

test("product message carries options, quantity and line total", () => {
  const msg = buildWhatsAppProductMessage({
    businessName: "Ada", productName: "Tote", options: { Colour: "Black", Size: "" }, quantity: 3, unitKobo: 500000,
  });
  assert.match(msg, /Tote \(Colour: Black\)/);
  assert.match(msg, /Quantity: 3 × ₦5,000 = ₦15,000/);
});
