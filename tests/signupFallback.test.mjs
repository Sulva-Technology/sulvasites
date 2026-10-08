import { test } from "node:test";
import assert from "node:assert/strict";

import { briefFromAnswers, parseSignupBody, personalizeSample } from "../src/lib/signup/fallbackSite.ts";
import { suggestTemplates } from "../src/lib/signup/suggest.ts";
import { TEMPLATE_KEYS } from "../src/lib/ai/templateChoice.ts";

const answers = { businessName: "Bola's Bakes", whatTheyDo: "Custom cakes and pastries", city: "Ibadan", whatsapp: "08031234567", sellOnline: true };
const isKey = (k) => TEMPLATE_KEYS.includes(k);

test("parseSignupBody validates and normalises", () => {
  const r = parseSignupBody({ answers, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey);
  assert.equal(r.ok, true);
  assert.equal(r.value.answers.whatsapp, "+2348031234567");
  assert.equal(r.value.tier, "commerce");
  assert.equal(parseSignupBody({ answers: { ...answers, businessName: "B" }, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers: { ...answers, whatsapp: "12" }, templateKey: "t14", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers, templateKey: "t99", tier: "commerce", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody({ answers, templateKey: "t14", tier: "gold", interval: "monthly" }, isKey).ok, false);
  assert.equal(parseSignupBody(null, isKey).ok, false);
});

test("brief carries the answers", () => {
  const b = briefFromAnswers({ ...answers, whatsapp: "+2348031234567" }, "bola@example.com");
  assert.equal(b.businessName, "Bola's Bakes");
  assert.equal(b.location, "Ibadan");
  assert.equal(b.contact.whatsapp, "+2348031234567");
  assert.equal(b.contact.email, "bola@example.com");
  assert.equal(b.shopIntent, true);
});

test("sample content gets the owner's name and contacts", () => {
  const sample = {
    profile: { business_name: "Ada \"Okafor\"", tagline: "x", description: "y" },
    pages: {
      home: { sections: [{ type: "hero", headline: "Welcome to Ada \"Okafor\"" }] },
      about: { sections: [] },
      contact: { sections: [] },
    },
  };
  const built = personalizeSample("t1", sample, { ...answers, whatsapp: "+2348031234567" }, "bola@example.com");
  assert.equal(built.templateKey, "t1");
  assert.equal(built.pages.home.sections[0].headline, "Welcome to Bola's Bakes");
  assert.equal(built.profile.business_name, "Bola's Bakes");
  assert.equal(built.profile.whatsapp, "+2348031234567");
  assert.equal(built.profile.email, "bola@example.com");
  assert.deepEqual(built.extraPages, []);
  assert.equal(sample.pages.home.sections[0].headline, "Welcome to Ada \"Okafor\"", "input not mutated");
});

test("three distinct real template suggestions", () => {
  for (const a of [answers, { ...answers, whatTheyDo: "", businessName: "", sellOnline: false }]) {
    const s = suggestTemplates(a);
    assert.equal(s.length, 3);
    assert.equal(new Set(s).size, 3);
    for (const k of s) assert.ok(TEMPLATE_KEYS.includes(k), k);
  }
  assert.deepEqual(suggestTemplates({ businessName: "", whatTheyDo: "", city: "", whatsapp: "", sellOnline: false }), ["t1", "t5", "t14"]);
});
