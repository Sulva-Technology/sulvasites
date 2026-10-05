import { test } from "node:test";
import assert from "node:assert/strict";
import { isStepVisible, nextVisibleIndex, stepPosition, needsNavigation } from "../src/lib/tour/steps.ts";

const steps = [
  { id: "a", title: "A", body: "a" },
  { id: "b", title: "B", body: "b", when: (ctx) => ctx.siteCount > 1 },
  { id: "c", title: "C", body: "c", route: (ctx) => (ctx.siteId ? `/dashboard/${ctx.siteId}` : null) },
  { id: "d", title: "D", body: "d" },
];

test("isStepVisible respects when and null route", () => {
  assert.equal(isStepVisible(steps[0], {}), true);
  assert.equal(isStepVisible(steps[1], { siteCount: 1 }), false);
  assert.equal(isStepVisible(steps[1], { siteCount: 2 }), true);
  assert.equal(isStepVisible(steps[2], {}), false);
  assert.equal(isStepVisible(steps[2], { siteId: "x" }), true);
});

test("nextVisibleIndex skips hidden steps both ways", () => {
  assert.equal(nextVisibleIndex(steps, -1, 1, {}), 0);
  assert.equal(nextVisibleIndex(steps, 0, 1, {}), 3);
  assert.equal(nextVisibleIndex(steps, 3, -1, {}), 0);
  assert.equal(nextVisibleIndex(steps, 3, 1, {}), -1);
  assert.equal(nextVisibleIndex(steps, 0, -1, {}), -1);
  assert.equal(nextVisibleIndex(steps, 0, 1, { siteCount: 2 }), 1);
});

test("stepPosition counts visible steps only", () => {
  assert.deepEqual(stepPosition(steps, 0, {}), { n: 1, total: 2 });
  assert.deepEqual(stepPosition(steps, 3, {}), { n: 2, total: 2 });
  assert.deepEqual(stepPosition(steps, 2, { siteId: "x", siteCount: 3 }), { n: 3, total: 4 });
});

test("needsNavigation exact vs prefix", () => {
  assert.equal(needsNavigation("/admin/sites", "/admin/sites"), false);
  assert.equal(needsNavigation("/admin/sites", "/admin/sites/abc"), true);
  assert.equal(needsNavigation("/admin/sites/1?view=settings", "/admin/sites/1"), true);
  assert.equal(needsNavigation("/admin/sites/1?view=settings", "/admin/sites/1?view=settings"), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/1/inbox", true), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/1?x=1", true), false);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard/12", true), true);
  assert.equal(needsNavigation("/dashboard/1", "/dashboard", true), true);
});

import { hasUnsavedWorkRisk } from "../src/lib/tour/steps.ts";

test("hasUnsavedWorkRisk flags editors and new-site", () => {
  for (const p of [
    "/admin/sites/new",
    "/admin/sites/abc/pages/home",
    "/admin/sites/abc/extra-pages/about",
    "/dashboard/abc/content/pages/home",
    "/dashboard/abc/content/extra-pages/faq",
  ]) assert.equal(hasUnsavedWorkRisk(p), true, p);
});

test("hasUnsavedWorkRisk false for other paths", () => {
  for (const p of ["/admin/sites", "/dashboard/x/inbox", "/admin/users", "/dashboard", "/admin/sites/abc"])
    assert.equal(hasUnsavedWorkRisk(p), false, p);
});
