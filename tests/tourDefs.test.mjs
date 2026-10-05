import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerTour } from "../src/lib/tour/ownerTour.ts";
import { adminTour } from "../src/lib/tour/adminTour.ts";
import { isStepVisible } from "../src/lib/tour/steps.ts";

const visible = (tour, ctx) => tour.steps.filter((s) => isStepVisible(s, ctx)).map((s) => s.id);

test("every step has id, title, body; ids unique", () => {
  for (const tour of [ownerTour, adminTour]) {
    const ids = tour.steps.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, tour.id);
    for (const s of tour.steps) assert.ok(s.title && s.body, `${tour.id}:${s.id}`);
  }
});

test("owner tour mentions no AI", () => {
  for (const s of ownerTour.steps) assert.doesNotMatch(`${s.title} ${s.body}`, /\bAI\b/);
});

test("owner: owner role on shop template", () => {
  const ids = visible(ownerTour, { siteId: "s1", siteCount: 1, tabs: ["overview", "content", "shop", "inbox", "insights", "team"] });
  assert.deepEqual(ids, ["welcome", "status", "tabs", "content", "inbox", "shop", "insights", "team", "replay"]);
});

test("owner: staff sees only their tabs", () => {
  const ids = visible(ownerTour, { siteId: "s1", siteCount: 1, tabs: ["overview", "inbox", "business"] });
  assert.deepEqual(ids, ["welcome", "status", "tabs", "inbox", "business", "replay"]);
});

test("owner: site list with several sites starts with pick-site", () => {
  const ids = visible(ownerTour, { siteCount: 3, firstSiteId: "s1" });
  assert.equal(ids[1], "pick-site");
  assert.ok(ids.includes("status"));
});

test("owner: no site at all keeps only centered steps", () => {
  assert.deepEqual(visible(ownerTour, { siteCount: 0 }), ["welcome", "replay"]);
});

test("owner route stays on current site sub-pages", () => {
  const status = ownerTour.steps.find((s) => s.id === "status");
  assert.equal(status.route({ siteId: "s1", firstSiteId: "s9" }), "/dashboard/s1");
  assert.equal(status.route({ firstSiteId: "s9" }), "/dashboard/s9");
  assert.equal(status.routePrefix, true);
});

test("owner autoStart only on landing pages", () => {
  assert.equal(ownerTour.autoStart("/dashboard"), true);
  assert.equal(ownerTour.autoStart("/dashboard/abc"), true);
  assert.equal(ownerTour.autoStart("/dashboard/abc/inbox"), false);
});

test("admin: full tour with a site includes AI chapter in order", () => {
  const ids = visible(adminTour, { firstSiteId: "s1" });
  assert.deepEqual(ids, [
    "welcome", "sites-list", "users", "new-site",
    "assistant-mode", "assistant-chat", "ai-content", "ai-seo-all", "ai-seo-page",
    "site-tabs", "replay",
  ]);
  const ai = adminTour.steps.find((s) => s.id === "ai-content");
  assert.equal(ai.route({ firstSiteId: "s1" }), "/admin/sites/s1?view=settings");
});

test("admin: no sites drops site-specific steps", () => {
  const ids = visible(adminTour, {});
  assert.ok(!ids.includes("ai-content"));
  assert.ok(!ids.includes("ai-seo-all"));
  assert.ok(!ids.includes("site-tabs"));
  assert.ok(ids.includes("assistant-chat"));
});

test("admin autoStart only on sites list", () => {
  assert.equal(adminTour.autoStart("/admin/sites"), true);
  assert.equal(adminTour.autoStart("/admin/sites/new"), false);
  assert.equal(adminTour.autoStart("/admin/users"), false);
});
