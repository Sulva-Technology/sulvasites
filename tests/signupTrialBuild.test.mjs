import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { briefFromAnswers } from "../src/lib/signup/fallbackSite.ts";
import { parseDetails } from "../src/lib/signup/ownerDetails.ts";
import { budgetChat, buildTrialSite } from "../src/lib/signup/trialBuild.ts";
import { draftFromDetails } from "../src/lib/signup/detailsDraft.ts";
import { getPageJobs } from "../src/lib/ai/pagePlans.ts";
import { writePage, rehydratePlan } from "../src/lib/ai/siteBuilder.ts";
import { GroqError } from "../src/lib/ai/groq.server.ts";
import { TEMPLATE_KEYS } from "../src/lib/ai/templateChoice.ts";

const answers = { businessName: "Bola's Bakes", whatTheyDo: "Custom cakes", city: "Ibadan", whatsapp: "+2348031234567", sellOnline: false };

const details = parseDetails(JSON.stringify({
  sulva: 1,
  businessName: "Bola's Bakes",
  tagline: "Cakes that make the day",
  whatWeDo: "Custom celebration cakes and pastries, baked fresh in Ibadan.",
  story: "Bola started baking in 2016 from her mum's kitchen in Bodija.\n\nToday a team of four bakes every order by hand, the same morning it is collected.",
  customers: "brides, parents and offices planning a celebration",
  areasServed: "Ibadan and Ogbomoso",
  openingHours: "Mon-Sat 9am-6pm",
  contact: { phone: "0803 123 4567", email: "hi@bolasbakes.ng" },
  services: [
    { name: "Wedding cakes", description: "Tiered cakes designed with you.", price: "from ₦150,000" },
    { name: "Birthday cakes", description: "Any flavour, any theme.", price: "from ₦25,000" },
    { name: "Cupcake boxes", description: "", price: "₦9,000 for 12" },
  ],
  whyChooseUs: [
    { title: "Baked the same day", description: "Every cake leaves the oven on the morning you collect it." },
    { title: "Real butter only", description: "No margarine or premixes, ever." },
    { title: "Delivery that cares", description: "We drive every tiered cake ourselves." },
  ],
  projects: [
    { title: "Adeyemi wedding, 5 tiers", description: "Ivory buttercream with sugar roses for 400 guests." },
    { title: "Shell office party", description: "120 branded cupcakes delivered by 8am." },
  ],
  highlights: ["Baking since 2016", "Over 3,000 cakes delivered"],
  testimonials: [{ name: "Kemi A.", role: "Bride", quote: "Best cake ever" }],
  team: [{ name: "Bola Ade", role: "Head baker", bio: "Trained at Lagos Culinary Academy." }],
  faqs: [
    { question: "Do you deliver?", answer: "Yes, across Ibadan and Ogbomoso." },
    { question: "How early should I order?", answer: "Two weeks for wedding cakes, three days for birthdays." },
  ],
  sellOnline: false,
}));

const down = async () => { throw new GroqError("bad_key", "no key", 401); };
const text = (v) => JSON.stringify(v);

// Distinctive sentences from the template demo content; none may ever reach a real owner's site.
const demoStrings = [...readFileSync(new URL("../src/templates/sampleSite.ts", import.meta.url), "utf8").matchAll(/"([^"\\]{30,})"/g)]
  .map((m) => m[1])
  .filter((s) => / /.test(s) && !/^https?:/.test(s));

async function offlineBuild(templateKey, d = details) {
  return buildTrialSite({ brief: briefFromAnswers(answers, "bola@example.com", d), templateKey, details: d, chat: down, budgetMs: 1000 });
}

test("every template builds from the owner's details when the AI is down, with no demo copy", async () => {
  assert.ok(demoStrings.length > 50, "demo strings found");
  for (const key of TEMPLATE_KEYS) {
    const built = await offlineBuild(key);
    const all = text(built);
    assert.equal(built.usedAi, false, key);
    for (const demo of demoStrings) assert.ok(!all.includes(demo), `${key} leaked demo copy: ${demo}`);

    const home = built.pages.home.sections;
    const hero = home.find((s) => s.type === "hero");
    assert.equal(hero.headline, "Cakes that make the day", key);
    const services = home.find((s) => s.type === "services");
    assert.ok(services, `${key} home has services`);
    assert.deepEqual(services.items.map((i) => i.title), ["Wedding cakes", "Birthday cakes", "Cupcake boxes"], key);
    assert.match(services.items[0].desc, /Tiered cakes designed with you\. From ₦150,000\./, key);
    assert.equal(services.items[2].desc, "₦9,000 for 12.", key);
    assert.deepEqual(home.find((s) => s.type === "values").items.map((i) => i.title), ["Baked the same day", "Real butter only", "Delivery that cares"], key);
    assert.equal(home.find((s) => s.type === "faq").items[0].question, "Do you deliver?", key);
    assert.ok(home.some((s) => s.type === "contact_card"), `${key} home keeps the contact card`);

    const about = built.pages.about.sections.find((s) => s.type === "richtext");
    assert.match(about.body, /Bola started baking in 2016/, key);
    assert.match(about.body, /Over 3,000 cakes delivered/, key);
    const hours = built.pages.contact.sections.find((s) => s.type === "richtext");
    assert.match(hours.body, /Mon-Sat 9am-6pm/, key);
  }
});

test("extra pages use the owner's work, services and team", async () => {
  const forge = await offlineBuild("t12");
  const projects = forge.extraPages.find((p) => p.key === "projects").data.sections.find((s) => s.type === "use_cases");
  assert.deepEqual(projects.items.map((i) => i.title), ["Adeyemi wedding, 5 tiers", "Shell office party"]);
  const tavola = await offlineBuild("t7");
  const menu = tavola.extraPages.find((p) => p.key === "menu").data.sections.find((s) => s.type === "services");
  assert.equal(menu.items.length, 3);
  const vital = await offlineBuild("t8");
  const doctors = vital.extraPages.find((p) => p.key === "doctors").data.sections.find((s) => s.type === "team");
  assert.equal(doctors.members[0].name, "Bola Ade");
});

test("without pasted details the site is generic copy about this business, never demo content", async () => {
  for (const key of TEMPLATE_KEYS) {
    const built = await offlineBuild(key, { kind: "empty" });
    const all = text(built);
    for (const demo of demoStrings) assert.ok(!all.includes(demo), `${key} leaked demo copy: ${demo}`);
    assert.match(all, /Bola's Bakes/, key);
    assert.ok(built.pages.contact.sections.some((s) => s.type === "contact_card"), key);
  }
});

test("the AI's sections win and empty ones fall back to the owner's details", async () => {
  const brief = briefFromAnswers(answers, "bola@example.com", details);
  const plan = rehydratePlan({ templateKey: "t1", brief });
  const heroOnly = JSON.stringify({
    seo: { title: "Celebration cakes in Ibadan | Bola's Bakes", description: "Custom cakes and pastries baked fresh in Ibadan." },
    sections: [{ type: "hero", headline: "Celebration cakes baked fresh", subtext: "Order wedding and birthday cakes in Ibadan.", ctaText: "Order a cake", ctaHref: "#contact" }],
  });
  const fallbackDraft = (job) => draftFromDetails(job, details.details, plan.brief, plan.templateKey);
  const r = await writePage(plan, "home", { chat: async () => heroOnly, fallbackDraft });
  assert.equal(r.aiFailed, false);
  assert.equal(r.data.sections.find((s) => s.type === "hero").headline, "Celebration cakes baked fresh");
  assert.equal(r.data.sections.find((s) => s.type === "services").items[0].title, "Wedding cakes");
});

test("budgetChat ends calls at the deadline and stops after a fatal provider error", async () => {
  let t = 0;
  const slow = budgetChat(() => new Promise((r) => setTimeout(() => r("late"), 200)), 20, () => t);
  await assert.rejects(slow.chat({ system: "", user: "" }), /ai_unavailable/);

  let calls = 0;
  const bad = budgetChat(async () => { calls++; throw new GroqError("bad_key", "x", 401); }, 10_000, () => 0);
  await assert.rejects(bad.chat({ system: "", user: "" }), (e) => !(e instanceof GroqError));
  await assert.rejects(bad.chat({ system: "", user: "" }), /ai_unavailable/);
  assert.equal(calls, 1);

  const ok = budgetChat(async () => "{}", 10_000, () => 0);
  assert.equal(await ok.chat({ system: "", user: "" }), "{}");
  assert.equal(ok.answered(), 1);

  t = 50;
  const late = budgetChat(async () => "{}", 20, () => t);
  await assert.rejects(late.chat({ system: "", user: "" }), /ai_unavailable/);
});

test("draftFromDetails without details leaves every slot to the generic fallback", () => {
  const brief = briefFromAnswers(answers, "bola@example.com");
  for (const job of getPageJobs("t5")) {
    assert.ok(draftFromDetails(job, null, brief, "t5").slots.every((s) => s === null));
  }
});

test("pasted opening hours become one row per line in the profile", async () => {
  const { finishTrialBuild, hoursLines } = await import("../src/lib/signup/fallbackSite.ts");
  assert.equal(hoursLines("Mon-Fri 9am-6pm, Sat 10am-4pm; Sun closed"), "Mon-Fri 9am-6pm\nSat 10am-4pm\nSun closed");
  assert.equal(hoursLines("Mon-Fri 9am-6pm, 7pm on Fridays"), "Mon-Fri 9am-6pm, 7pm on Fridays");
  const built = finishTrialBuild(await offlineBuild("t7"), details, null);
  assert.equal(built.profile.socials.hours, "Mon-Sat 9am-6pm");
  const none = finishTrialBuild(await offlineBuild("t7", { kind: "empty" }), { kind: "empty" }, null);
  assert.equal(none.profile.socials.hours, undefined);
});
