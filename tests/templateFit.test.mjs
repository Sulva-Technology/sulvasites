import { test } from "node:test";
import assert from "node:assert/strict";

import { businessFitsTemplate } from "../src/lib/templateFit.ts";
import { suggestTemplates } from "../src/lib/signup/suggest.ts";

const p = (business_name, tagline, description = "") => ({ business_name, tagline, description });

test("a design keeps its industry wording unless the business is plainly in another industry", () => {
  assert.equal(businessFitsTemplate(p("Sulva Technology", "We are a tech firm that builds and sells tech products"), "t15"), false);
  assert.equal(businessFitsTemplate(p("Kings Motors", "Pre-owned luxury cars in Lekki"), "t15"), true);
  assert.equal(businessFitsTemplate(p("Tolu Writes", "A lifestyle blog"), "t7"), false);
  assert.equal(businessFitsTemplate(p("Mama Put", "Restaurant and catering in Ibadan"), "t7"), true);
  // Says little or nothing a keyword knows: keep the design's own wording.
  assert.equal(businessFitsTemplate(p("Grace Care", "We look after families"), "t8"), true);
  assert.equal(businessFitsTemplate(p("Anything", null), "t8"), true);
  assert.equal(businessFitsTemplate(null, "t5"), true);
  // Shop designs are built around the cart; never neutralised.
  assert.equal(businessFitsTemplate(p("Sulva Technology", "A tech firm"), "t14"), true);
});

test("suggestions: the best match, then its closest designs, never unrelated fillers", () => {
  const a = (whatTheyDo, sellOnline = false) => ({ businessName: "Tolu", whatTheyDo, city: "Lagos", whatsapp: "", sellOnline });
  assert.deepEqual(suggestTemplates(a("I'm a blogger")), ["t17", "t2", "t3"]);
  assert.deepEqual(suggestTemplates(a("Content creator and influencer")), ["t17", "t2", "t3"]);
  assert.deepEqual(suggestTemplates(a("We run a church")), ["t16", "t10", "t17"]);
  assert.deepEqual(suggestTemplates(a("I sell shoes")), ["t13", "t14", "t2"]);
  assert.ok(!suggestTemplates(a("I'm a blogger")).includes("t5"), "no beauty salon for a blogger");
});
