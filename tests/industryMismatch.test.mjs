// A business on a design made for another industry (the live bug: a tech firm on the Automotive
// "Marque" design was published as a classic-car dealer). The words must follow the business.
import { test } from "node:test";
import assert from "node:assert/strict";

import { emptyBrief } from "../src/lib/ai/brief.ts";
import { getPageJobs } from "../src/lib/ai/pagePlans.ts";
import { buildPagePrompt, buildProfilePrompt } from "../src/lib/ai/prompts/builders.ts";
import { GENERIC_INDUSTRY, getIndustry } from "../src/lib/ai/prompts/industries.ts";
import { buildSite, buildSiteOffline, withDeadline } from "../src/lib/ai/siteBuilder.ts";
import { industryFor, resolveTemplateChoice } from "../src/lib/ai/templateChoice.ts";

const brief = (whatTheyDo, extra = {}) => ({ ...emptyBrief(), businessName: "Adeola & Co", whatTheyDo, location: "Ado-Ekiti", ...extra });
const techFirm = brief("We are a tech firm that builds and sells tech products", {
  businessName: "Sulva Technology",
  contact: { ...emptyBrief().contact, whatsapp: "+2347068495149", phone: "+2347068495149", email: "owner@example.com" },
});
const CAR_WORDS = /\b(cars?|vehicles?|showroom|test drive|mileage|ferrari|porsche|mustang|marques?|automotive|dealer(ship)?)\b/i;

test("the writing guide follows the business, not the design", () => {
  assert.equal(industryFor(techFirm, "t15").key, "t4");
  assert.equal(industryFor(brief("Classic car dealership and restoration"), "t15").key, "t15");
  assert.equal(industryFor(brief("We sell Toyota and Lexus"), "t15").key, "t15");
  assert.equal(industryFor(brief("Hand-poured scented candles"), "t15"), GENERIC_INDUSTRY);
  assert.equal(industryFor(brief(""), "t15").key, "t15", "nothing to judge: keep the template's guide");
  assert.equal(industryFor(techFirm, "t14").key, "t14", "shop templates keep their cart rules");
});

test("prompts for a tech firm on the Automotive design never mention cars", () => {
  const prompts = [buildProfilePrompt(techFirm, "t15"), ...getPageJobs("t15", techFirm).map((job) => buildPagePrompt({ brief: techFirm, templateKey: "t15", job }))];
  for (const p of prompts) assert.doesNotMatch(p.system + p.user, CAR_WORDS);
  assert.match(buildPagePrompt({ brief: techFirm, templateKey: "t15", job: getPageJobs("t15", techFirm)[0] }).system, /only a layout/);
});

test("extra pages follow the business; car dealers keep theirs", () => {
  assert.deepEqual(getPageJobs("t15", techFirm).filter((j) => j.kind === "extra").map((j) => j.key), ["features", "how-it-works"]);
  assert.deepEqual(getPageJobs("t15", brief("Hand-poured scented candles")).filter((j) => j.kind === "extra").map((j) => j.key), ["services"]);
  const dealer = brief("Used cars for sale");
  assert.deepEqual(getPageJobs("t15", dealer).filter((j) => j.kind === "extra").map((j) => j.key), ["inventory", "services", "stories"]);
  assert.deepEqual(getPageJobs("t15").map((j) => j.key), getPageJobs("t15", dealer).map((j) => j.key));
});

test("photos follow the business when the owner picked the design", () => {
  assert.equal(resolveTemplateChoice(null, techFirm, "t15").photoCategory, getIndustry("t4").photoCategory);
  assert.equal(resolveTemplateChoice(null, brief("Classic car dealership"), "t15").photoCategory, "automotive");
});

test("with no AI the site is written from the owner's words, never another business's sample", async () => {
  const site = await buildSiteOffline({ state: techFirm, templateOverride: "t15" });
  assert.equal(site.templateKey, "t15");
  const text = JSON.stringify([site.profile, site.pages, site.extraPages.map((e) => ({ label: e.label, data: e.data }))]).replace(/https?:\/\/[^"]+/g, "");
  assert.doesNotMatch(text, CAR_WORDS);
  assert.match(text, /Sulva Technology/);
  assert.match(text, /tech firm/i);
  assert.equal(site.profile.whatsapp, "+2347068495149");
});

test("a slow AI is abandoned at the deadline and finished pages are kept", async () => {
  const never = () => new Promise(() => {});
  await assert.rejects(withDeadline(never, Date.now() + 20)({ system: "", user: "" }), /time budget/);
  await assert.rejects(withDeadline(async () => "late", Date.now() - 1)({ system: "", user: "" }), /time budget/);
  assert.equal(await withDeadline(async () => "ok", Date.now() + 1000)({ system: "", user: "" }), "ok");

  const started = Date.now();
  const site = await buildSite({ state: techFirm, templateOverride: "t15" }, { chat: never, deadline: Date.now() + 50 });
  assert.ok(Date.now() - started < 2000, "returns soon after the deadline");
  assert.match(JSON.stringify(site.pages.home), /Sulva Technology|tech firm/i);
});
