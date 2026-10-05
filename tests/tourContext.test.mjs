import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeTourContext } from "../src/lib/tour/context.ts";

test("mergeTourContext: undefined extra does not clobber base", () => {
  const out = mergeTourContext({ siteCount: 2, firstSiteId: "a" }, { firstSiteId: undefined, siteId: "s" });
  assert.deepEqual(out, { siteCount: 2, firstSiteId: "a", siteId: "s" });
});

test("mergeTourContext: defined extra wins", () => {
  assert.equal(mergeTourContext({ firstSiteId: "a" }, { firstSiteId: "b" }).firstSiteId, "b");
});

test("mergeTourContext: undefined base ok", () => {
  assert.deepEqual(mergeTourContext(undefined, { siteId: "x" }), { siteId: "x" });
});
