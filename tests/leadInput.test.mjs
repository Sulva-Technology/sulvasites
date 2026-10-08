import { test } from "node:test";
import assert from "node:assert/strict";

import { parseLeadInput } from "../src/lib/marketing/leadInput.ts";

const KEYS = ["t1", "t7"];
const ok = { name: "Ada Okafor", email: "ada@example.com", phone: "0803 123 4567", business: "Ada's Kitchen", templateKey: "t7", tier: "commerce", notes: "Jollof" };

test("valid brief is normalised", () => {
  const r = parseLeadInput(ok, KEYS);
  assert.equal(r.ok, true);
  assert.equal(r.value.phone, "+2348031234567");
  assert.equal(r.value.email, "ada@example.com");
  assert.equal(r.value.templateKey, "t7");
  assert.equal(r.value.tier, "commerce");
  assert.equal(r.value.domain, null);
  assert.equal(r.value.honeypot, false);
});

test("international phone kept, junk rejected", () => {
  assert.equal(parseLeadInput({ ...ok, phone: "+44 7700 900123" }, KEYS).value.phone, "+447700900123");
  assert.equal(parseLeadInput({ ...ok, phone: "12" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, email: "nope" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, name: "A" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, business: "" }, KEYS).ok, false);
  assert.equal(parseLeadInput(null, KEYS).ok, false);
});

test("unknown template / tier dropped, domain validated, honeypot flagged", () => {
  const r = parseLeadInput({ ...ok, templateKey: "t99", tier: "gold", domain: "AdasKitchen.com.ng" }, KEYS);
  assert.equal(r.value.templateKey, null);
  assert.equal(r.value.tier, null);
  assert.equal(r.value.domain, "adaskitchen.com.ng");
  assert.equal(parseLeadInput({ ...ok, domain: "not a domain" }, KEYS).ok, false);
  assert.equal(parseLeadInput({ ...ok, website: "spam" }, KEYS).value.honeypot, true);
});
