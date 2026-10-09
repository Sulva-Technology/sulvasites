import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyDetailsToBrief,
  applyDetailsToPages,
  buildDetailsPrompt,
  detailsSummary,
  parseDetails,
} from "../src/lib/signup/ownerDetails.ts";
import { briefFromAnswers, finishTrialBuild, parseSignupBody } from "../src/lib/signup/fallbackSite.ts";
import { briefToText, normalizeBrief } from "../src/lib/ai/brief.ts";
import { TEMPLATE_KEYS } from "../src/lib/ai/templateChoice.ts";

const answers = { businessName: "Bola's Bakes", whatTheyDo: "Custom cakes", city: "Ibadan", whatsapp: "08031234567", sellOnline: false };

const pasted = `Here is your block!
\`\`\`json
{
  "sulva": 1,
  "businessName": "Bola's Bakes",
  "tagline": "Cakes that make the day",
  "whatWeDo": "Custom celebration cakes and pastries in Ibadan.",
  "story": "Bola started baking in 2016 from her mum's kitchen.",
  "openingHours": "Mon-Sat 9am-6pm",
  "contact": { "phone": "0803 123 4567", "email": "hi@bolasbakes.ng", "instagram": "@bolasbakes", "x": "bolasbakes" },
  "services": [{ "name": "Wedding cakes", "description": "Tiered cakes.", "price": "from ₦150,000" }, { "name": "Cupcakes", "description": "", "price": "" }],
  "testimonials": [{ "name": "Kemi A.", "role": "Bride", "quote": “Best cake ever” }, { "name": "", "quote": "no name, dropped" }],
  "team": [{ "name": "Bola Ade", "role": "Head baker", "bio": "Trained at Le Cordon Bleu." }],
  "faqs": [{ "question": "Do you deliver?", "answer": "Yes, across Ibadan." }],
  "partners": ["Ibadan Hotel", "Events Co"],
  "brandColors": "pink and maroon",
  "sellOnline": true
}
\`\`\`
Good luck!`;

test("prompt is tailored to the design", () => {
  const p = buildDetailsPrompt({ ...answers, templateKey: "t7" });
  assert.match(p, /Bola's Bakes/);
  assert.match(p, /Menu/);
  assert.match(p, /dishes and drinks/);
  assert.match(p, /"testimonials"/);
  assert.match(p, /Never make up/);
  for (const k of TEMPLATE_KEYS) assert.ok(buildDetailsPrompt({ ...answers, templateKey: k }).length > 500, k);
});

test("parses fenced JSON with smart quotes and drops incomplete items", () => {
  const r = parseDetails(pasted);
  assert.equal(r.kind, "json");
  const d = r.details;
  assert.equal(d.tagline, "Cakes that make the day");
  assert.equal(d.services.length, 2);
  assert.equal(d.services[0].price, "from ₦150,000");
  assert.equal(d.testimonials.length, 1);
  assert.equal(d.testimonials[0].quote, "Best cake ever");
  assert.equal(d.contact.x, "bolasbakes");
  assert.equal(d.sellOnline, true);
  assert.ok(detailsSummary(d).includes("1 review"));
});

test("non-JSON paste becomes notes; empty stays empty", () => {
  assert.deepEqual(parseDetails("   "), { kind: "empty" });
  assert.deepEqual(parseDetails(undefined), { kind: "empty" });
  const t = parseDetails("We bake cakes {not json");
  assert.equal(t.kind, "text");
  assert.match(t.text, /bake cakes/);
  assert.equal(parseDetails("{}").kind, "text");
});

test("details enrich the brief and survive normalizeBrief", () => {
  const b = briefFromAnswers({ ...answers, whatsapp: "+2348031234567" }, "bola@example.com", parseDetails(pasted));
  assert.equal(b.businessName, "Bola's Bakes", "wizard name wins");
  assert.equal(b.contact.whatsapp, "+2348031234567", "wizard WhatsApp wins");
  assert.equal(b.contact.email, "hi@bolasbakes.ng");
  assert.deepEqual(b.services, ["Wedding cakes", "Cupcakes"]);
  assert.equal(b.shopIntent, true);
  assert.equal(b.colors, "pink and maroon");
  assert.match(b.facts, /Mon-Sat 9am-6pm/);
  assert.match(b.facts, /from ₦150,000/);
  const again = normalizeBrief(b);
  assert.equal(again.facts, b.facts);
  assert.match(briefToText(again), /More facts from the owner:\n/);
  const notes = applyDetailsToBrief(normalizeBrief({}), { kind: "text", text: "Open late on Fridays" });
  assert.equal(notes.facts, "Open late on Fridays");
});

test("real reviews, team, FAQs and partners land in the pages", () => {
  const d = parseDetails(pasted).details;
  const page = (sections) => ({ seo: { title: "", description: "" }, sections });
  const pages = {
    home: page([{ type: "hero" }, { type: "services", items: [] }, { type: "faq", title: "FAQ", items: [{ question: "Do you deliver?", answer: "ai" }, { question: "Prices?", answer: "ai" }] }, { type: "contact_card" }]),
    about: page([{ type: "hero" }, { type: "richtext" }, { type: "values", items: [] }, { type: "contact_card" }]),
    contact: page([{ type: "hero" }, { type: "contact_card" }]),
  };
  const out = applyDetailsToPages(pages, d, "t7");
  const types = out.home.sections.map((s) => s.type);
  assert.deepEqual(types, ["hero", "services", "backed_by", "testimonials", "faq", "contact_card"]);
  const faq = out.home.sections.find((s) => s.type === "faq");
  assert.deepEqual(faq.items.map((f) => f.answer), ["Yes, across Ibadan.", "ai"], "owner answer wins, duplicate dropped");
  const team = out.about.sections.find((s) => s.type === "team");
  assert.equal(team.members[0].name, "Bola Ade");
  assert.deepEqual(out.about.sections.map((s) => s.type), ["hero", "richtext", "team", "values", "contact_card"]);
  assert.equal(out.contact.sections.length, 2, "contact page untouched");
  assert.equal(pages.home.sections.length, 4, "input not mutated");
});

test("signup body carries details and a valid colour; build gets theme colours", () => {
  const isKey = (k) => TEMPLATE_KEYS.includes(k);
  const base = { answers, templateKey: "t7", tier: "business", interval: "monthly" };
  const r = parseSignupBody({ ...base, details: pasted, color: { accent: "#AA3366", accent2: "#111111", source: "logo" } }, isKey);
  assert.equal(r.ok, true);
  assert.equal(r.value.details.kind, "json");
  assert.equal(r.value.color.accent, "#AA3366");
  assert.equal(parseSignupBody({ ...base, color: { accent: "red", accent2: "#111111" } }, isKey).value.color, null);
  assert.equal(parseSignupBody(base, isKey).value.details.kind, "empty");

  const build = {
    templateKey: "t7",
    profile: { business_name: "Bola's Bakes", tagline: "ai", description: "d", address: null, phone: null, email: "x@y.z", whatsapp: "+234", socials: { instagram: null, facebook: null, twitter: null, tiktok: null } },
    pages: { home: { seo: {}, sections: [] }, about: { seo: {}, sections: [] }, contact: { seo: {}, sections: [] } },
    extraPages: [],
  };
  const done = finishTrialBuild(build, r.value.details, r.value.color);
  assert.equal(done.profile.tagline, "Cakes that make the day");
  assert.equal(done.profile.socials.twitter, "bolasbakes");
  assert.equal(done.themeColors.accent2, "#111111");
  const fromWords = finishTrialBuild(build, r.value.details, null);
  assert.ok(fromWords.themeColors, "brand colour words used when there is no logo");
  assert.equal(finishTrialBuild(build, { kind: "empty" }, null).themeColors, undefined);
});
