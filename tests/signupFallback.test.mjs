import { test } from "node:test";
import assert from "node:assert/strict";

import { briefFromAnswers, parseSignupBody } from "../src/lib/signup/fallbackSite.ts";
import { buildSiteOffline } from "../src/lib/ai/siteBuilder.ts";
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

test("without AI the site is written from the answers, not the template's sample business", async () => {
  const owner = { ...answers, whatsapp: "+2348031234567" };
  for (const key of ["t1", "t15", "t5"]) {
    const built = await buildSiteOffline({ state: briefFromAnswers(owner, "bola@example.com"), templateOverride: key });
    const text = JSON.stringify(built.pages);
    assert.equal(built.profile.business_name, "Bola's Bakes");
    assert.equal(built.profile.whatsapp, "+2348031234567");
    assert.equal(built.profile.email, "bola@example.com");
    assert.match(text, /cakes and pastries/i);
    assert.doesNotMatch(text, /automotive legends|Ferrari|collector cars|showroom/i, `${key}: sample business leaked`);
    assert.match(built.pages.home.sections.find((x) => x.type === "hero").headline, /cakes and pastries/i);
  }
});

test("three distinct real template suggestions", () => {
  for (const a of [answers, { ...answers, whatTheyDo: "", businessName: "", sellOnline: false }]) {
    const s = suggestTemplates(a);
    assert.equal(s.length, 3);
    assert.equal(new Set(s).size, 3);
    for (const k of s) assert.ok(TEMPLATE_KEYS.includes(k), k);
  }
  assert.deepEqual(suggestTemplates({ businessName: "", whatTheyDo: "", city: "", whatsapp: "", sellOnline: false }), ["t1", "t3", "t4"]);
});
