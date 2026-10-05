import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeBrief } from "../src/lib/ai/brief.ts";
import { TEMPLATE_KEYS, chooseTemplateFallback, resolveTemplateChoice } from "../src/lib/ai/templateChoice.ts";

const b = (what, extra = {}) => normalizeBrief({ businessName: "X", whatTheyDo: what, ...extra });

test("keyword fallback picks the closest industry", () => {
  const cases = [
    ["We run a restaurant and catering service", "t7"],
    ["A dental clinic for families", "t8"],
    ["Bridal makeup and hair salon", "t5"],
    ["Gym and personal trainer", "t9"],
    ["Primary school and extra lessons", "t10"],
    ["Plumber and electrician for homes", "t12"],
    ["Estate agent selling land and apartments", "t6"],
    ["Wedding planner and event decor", "t11"],
    ["Accounting and tax advisory firm", "t1"],
  ];
  for (const [what, key] of cases) assert.equal(chooseTemplateFallback(b(what)).templateKey, key, what);
});

test("fallback with no signal is t1, and t14 for online shops", () => {
  assert.equal(chooseTemplateFallback(b("We do things")).templateKey, "t1");
  assert.equal(chooseTemplateFallback(b("We do things", { shopIntent: true })).templateKey, "t14");
});

test("shop intent restricts to shop templates and no intent excludes them", () => {
  assert.equal(chooseTemplateFallback(b("fashion boutique selling clothing", { shopIntent: true })).templateKey, "t13");
  assert.equal(chooseTemplateFallback(b("restaurant and cafe", { shopIntent: true })).templateKey, "t14");
  assert.notEqual(chooseTemplateFallback(b("fashion boutique clothing", { shopIntent: false })).templateKey, "t13");
});

test("reason and alternatives are filled and valid", () => {
  const c = chooseTemplateFallback(b("restaurant with a bar and lounge"));
  assert.match(c.reason, /restaurant/i);
  for (const a of c.alternatives) assert.ok(TEMPLATE_KEYS.includes(a.templateKey) && a.templateKey !== c.templateKey);
  assert.equal(c.photoCategory, "food");
});

test("model output with an invalid key falls back deterministically", () => {
  const c = resolveTemplateChoice({ templateKey: "t99", reason: "x" }, b("A dental clinic"));
  assert.equal(c.templateKey, "t8");
  assert.equal(c.source, "fallback");
  assert.equal(resolveTemplateChoice("garbage", b("A dental clinic")).templateKey, "t8");
  assert.equal(resolveTemplateChoice(null, b("A dental clinic")).templateKey, "t8");
});

test("valid model output is kept, with clipped reason, filtered alternatives and category", () => {
  const c = resolveTemplateChoice(
    {
      templateKey: "t8",
      reason: "r".repeat(400),
      alternatives: [{ templateKey: "t8", reason: "same" }, { templateKey: "zzz", reason: "bad" }, { templateKey: "t1", reason: "ok" }],
      photoCategory: "Real Estate",
    },
    b("A dental clinic"),
  );
  assert.equal(c.templateKey, "t8");
  assert.equal(c.source, "model");
  assert.equal(c.reason.length, 160);
  assert.deepEqual(c.alternatives.map((a) => a.templateKey), ["t1"]);
  assert.equal(c.photoCategory, "real_estate");
});

test("model cannot pick a shop template for a non-shop brief, nor a non-shop for a shop brief", () => {
  assert.equal(resolveTemplateChoice({ templateKey: "t14" }, b("A dental clinic", { shopIntent: false })).templateKey, "t8");
  assert.equal(resolveTemplateChoice({ templateKey: "t14" }, b("A dental clinic")).templateKey, "t8");
  assert.equal(resolveTemplateChoice({ templateKey: "t7" }, b("restaurant", { shopIntent: true })).templateKey, "t14");
  assert.equal(resolveTemplateChoice({ templateKey: "t13" }, b("clothes", { shopIntent: true })).templateKey, "t13");
});

test("user override wins when it is a real key", () => {
  const c = resolveTemplateChoice({ templateKey: "t8" }, b("A dental clinic"), "t3");
  assert.equal(c.templateKey, "t3");
  assert.equal(c.source, "user");
  assert.equal(resolveTemplateChoice({ templateKey: "t8" }, b("A dental clinic"), "nope").templateKey, "t8");
});
