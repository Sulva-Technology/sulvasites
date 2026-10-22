import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { publicPage, publicSection } from "../src/lib/publicContent.ts";
import { buildPresetPageData, getPagePresets } from "../src/templates/pagePresets.ts";
import { TEMPLATE_KEYS } from "../src/lib/ai/templateChoice.ts";

test("blank items go and sections with nothing real are dropped", () => {
  const page = {
    seo: { title: "x", description: "" },
    sections: [
      { type: "hero", headline: "", subtext: "", ctaText: "", ctaHref: "" },
      { type: "services", items: [{ title: "Wedding cakes", desc: "" }, { title: " ", desc: "x" }] },
      { type: "values", items: [{ title: "", desc: "" }] },
      { type: "testimonials", title: "Reviews", items: [{ name: "", role: "", quote: "" }, { name: "Kemi", role: "", quote: "Lovely" }] },
      { type: "testimonials", title: "Empty", items: [{ name: "Ada", role: "CEO", quote: "" }] },
      { type: "faq", title: "FAQ", items: [{ question: "Q?", answer: "" }] },
      { type: "backed_by", title: "Trusted by", logos: [{ name: "", url: null }] },
      { type: "team", title: "", subtitle: "", members: [{ name: "", role: "Owner", bio: "" }] },
      { type: "use_cases", title: "Work", description: "", items: [{ title: "Adeyemi wedding", description: "" }] },
      { type: "richtext", title: "About", body: "<p> </p>" },
      { type: "richtext", title: "Story", body: "<p>Since 2016.</p>" },
      { type: "gallery", title: "", images: [{ url: "", alt: "" }] },
      { type: "contact_card", showForm: true, mapLink: "" },
    ],
  };
  const out = publicPage(page);
  assert.deepEqual(out.sections.map((s) => s.type), ["hero", "services", "testimonials", "use_cases", "richtext", "gallery", "contact_card"]);
  assert.deepEqual(out.sections[1].items, [{ title: "Wedding cakes", desc: "" }]);
  assert.deepEqual(out.sections[2].items.map((i) => i.name), ["Kemi"]);
  assert.equal(page.sections.length, 13, "input not mutated");
  assert.equal(publicPage(null), null);
});

test("an unfilled preset page publishes no empty lists (so templates never fall back to demo copy)", () => {
  for (const key of TEMPLATE_KEYS) {
    for (const preset of getPagePresets(key)) {
      const out = publicPage(buildPresetPageData(preset));
      for (const s of out.sections) {
        assert.ok(["hero", "gallery", "contact_card"].includes(s.type), `${key}/${preset.key} kept empty ${s.type}`);
      }
    }
  }
});

test("other section types pass through unchanged", () => {
  const hero = { type: "hero", headline: "Hi", subtext: "", ctaText: "", ctaHref: "" };
  assert.equal(publicSection(hero), hero);
});

// Template sources must not state facts a business never gave: reply times, star ratings, founding
// years from today's date, default cities, or demo values saved into real items while editing.
const BANNED = [
  /within one business day/i,
  /within a few hours/i,
  /booking fee may apply/i,
  /aria-label="5 out of 5"/,
  /getFullYear\(\) - \d/,
  /\|\| "(Lagos|Abuja|Ibadan)"/,
  /Math\.max\(titles\.length/,
  /\|\| FALLBACK(_QUOTE|\[)/,
  /\.(name|role) \|\| "(Client name|Happy customer|Happy client|Managing Director|Bride|Homeowner|Agent name|Property advisor|Artist name|Makeup artist)"/,
  /FALLBACK\.map\(\(name\) => \(\{ name,/,
];

function templateSources() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".tsx")) out.push(p);
    }
  };
  walk(new URL("../src/templates", import.meta.url).pathname);
  return out;
}

test("templates make no invented claims", () => {
  const files = templateSources();
  assert.ok(files.length > 100);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const re of BANNED) assert.ok(!re.test(src), `${f.split("/src/")[1]} matches ${re}`);
  }
});
