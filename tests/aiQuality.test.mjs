import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeBrief } from "../src/lib/ai/brief.ts";
import { applyQualityGate, fitSentence, lintPage, sanitizeRichHtml } from "../src/lib/ai/quality.ts";

const brief = normalizeBrief({
  businessName: "Kings Bakery",
  whatTheyDo: "We bake bread and cakes",
  location: "Lagos",
  contact: { phone: "08031234567", email: "hello@kings.ng" },
});
const ctx = { brief, templateKey: "t7", extraKeys: ["menu"], labels: { home: "Home", about: "About", menu: "Menu" } };

const page = (sections, seo = { title: "Cakes in Lagos", description: "Order cakes and bread for pickup. Message us today." }) => ({ seo, sections });
const hero = (o = {}) => ({ type: "hero", headline: "Fresh bread, baked daily", subtext: "Order loaves and cakes for pickup.", ctaText: "Order today", ctaHref: "#contact", ...o });
const contact = { type: "contact_card", showForm: true, mapLink: "" };

test("lint flags banned phrases, invented stats, prices and emails", () => {
  const issues = lintPage(
    page([hero({ headline: "Welcome to Kings Bakery", subtext: "Trusted by 5,000 customers for 15 years. Cakes from ₦8,000. Mail sales@other.com" })]),
    brief,
  );
  const codes = issues.map((i) => i.code);
  assert.ok(codes.includes("banned"));
  assert.ok(codes.includes("invented-number"));
  assert.ok(codes.includes("invented-contact"));
});

test("lint allows numbers the owner gave and small counts", () => {
  const b = normalizeBrief({ businessName: "Kings Bakery", whatTheyDo: "We bake 3 kinds of bread and open since 2012", contact: {} });
  const ok = lintPage(page([hero({ subtext: "Three steps. 3 flavours. Open since 2012." })]), b);
  assert.deepEqual(ok, []);
  assert.equal(lintPage(page([hero({ subtext: "Open since 1999." })]), b).length, 1);
});

test("gate removes banned and invented sentences but keeps the rest", () => {
  const { pages } = applyQualityGate(
    { home: page([hero({ subtext: "World-class bakers. Order loaves and cakes for pickup. Over 500 happy clients." }), contact]) },
    ctx,
  );
  assert.equal(pages.home.sections[0].subtext, "Order loaves and cakes for pickup.");
});

test("gate never empties a field: it strips the phrase instead", () => {
  const { pages } = applyQualityGate({ home: page([hero({ headline: "Welcome to Kings Bakery" }), contact]) }, ctx);
  assert.equal(pages.home.sections[0].headline, "Kings Bakery");
});

test("gate replaces filler words", () => {
  const { pages } = applyQualityGate({ home: page([hero({ subtext: "We leverage a seamless ordering process." }), contact]) }, ctx);
  assert.equal(pages.home.sections[0].subtext, "We use a smooth ordering process.");
});

test("gate enforces length budgets on word or sentence boundaries", () => {
  const long = "Fresh bread and cakes baked every morning. ".repeat(10);
  const { pages } = applyQualityGate({ home: page([hero({ headline: "H".repeat(30) + " " + "word ".repeat(20), subtext: long }), contact]) }, ctx);
  const h = pages.home.sections[0];
  assert.ok(h.headline.length <= 60);
  assert.ok(h.subtext.length <= 160);
  assert.ok(h.subtext.endsWith("."));
});

test("gate fixes CTA hrefs: unknown links fall back, valid ones stay", () => {
  const out = applyQualityGate(
    {
      home: page([hero({ ctaHref: "https://evil.example/x" }), { type: "use_cases", title: "T", description: "D", items: [{ title: "A", description: "B", linkText: "Go", linkHref: "/p/menu" }, { title: "C", description: "D", linkText: "Go", linkHref: "/p/nope" }] }, contact]),
      menu: page([hero({ ctaHref: "#contact" })]),
    },
    ctx,
  );
  assert.equal(out.pages.home.sections[0].ctaHref, "#contact");
  assert.equal(out.pages.home.sections[1].items[0].linkHref, "/p/menu");
  assert.equal(out.pages.home.sections[1].items[1].linkHref, "#contact");
  // menu page has no contact card: #contact is not valid there, so the button is dropped
  assert.equal(out.pages.menu.sections[0].ctaHref, "");
  assert.equal(out.pages.menu.sections[0].ctaText, "");
});

test("shop templates keep the hero button text (the template supplies the link)", () => {
  const out = applyQualityGate({ home: page([hero({ ctaHref: "", ctaText: "Shop now" })]) }, { ...ctx, templateKey: "t14" });
  assert.equal(out.pages.home.sections[0].ctaText, "Shop now");
});

test("gate dedupes repeated items and keeps SEO unique and branded", () => {
  const out = applyQualityGate(
    {
      home: page(
        [hero(), { type: "faq", title: "FAQ", items: [{ question: "How to order?", answer: "A" }, { question: "How to order?", answer: "B" }] }, contact],
        { title: "Fresh cakes", description: "Order cakes today." },
      ),
      about: page([hero(), contact], { title: "Fresh cakes", description: "Order cakes today." }),
    },
    ctx,
  );
  assert.equal(out.pages.home.sections[1].items.length, 1);
  assert.match(out.pages.home.seo.title, /Kings Bakery/);
  assert.notEqual(out.pages.home.seo.title, out.pages.about.seo.title);
  assert.notEqual(out.pages.home.seo.description, out.pages.about.seo.description);
  assert.ok(out.pages.about.seo.title.length <= 60);
});

test("richtext html is limited to the allowed tags and cleaned per text node", () => {
  const html = sanitizeRichHtml('<div style="x"><h2>Hi</h2><p onclick="a()">Text <b>bold</b></p><script>x()</script><ol><li>One</li></ol></div>');
  assert.equal(html, "<h3>Hi</h3><p>Text <strong>bold</strong></p><ul><li>One</li></ul>");
  const out = applyQualityGate(
    { home: page([{ type: "richtext", title: "T", body: "<p>Our world-class team is here. Message us to order.</p>" }, contact]) },
    ctx,
  );
  assert.equal(out.pages.home.sections[0].body, "<p>Message us to order.</p>");
});

test("fitSentence prefers sentence ends", () => {
  assert.equal(fitSentence("One short sentence. Another long sentence follows here.", 30), "One short sentence.");
  assert.equal(fitSentence("alpha beta gamma delta", 12), "alpha beta");
});
