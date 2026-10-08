import { test } from "node:test";
import assert from "node:assert/strict";

import { HOME_FAQ, PRICING_FAQ, SHOWCASE_KEYS, TEMPLATE_GROUPS } from "../src/lib/marketing/content.ts";
import { TEMPLATE_META } from "../src/templates/meta.ts";

test("every template is in exactly one gallery group", () => {
  const all = TEMPLATE_GROUPS.flatMap((g) => g.keys);
  assert.deepEqual([...all].sort(), TEMPLATE_META.map((t) => t.key).sort());
  assert.equal(new Set(all).size, all.length);
});

test("showcase keys are real templates", () => {
  const keys = new Set(TEMPLATE_META.map((t) => t.key));
  assert.equal(SHOWCASE_KEYS.length, 6);
  for (const k of SHOWCASE_KEYS) assert.ok(keys.has(k), k);
});

test("FAQ copy mentions the real numbers", () => {
  const text = [...HOME_FAQ, ...PRICING_FAQ].map((f) => f.q + f.a).join(" ");
  assert.match(text, /7 days/);
  assert.match(text, /8 Apr 2027/);
  assert.match(text, /₦25,000/);
});
