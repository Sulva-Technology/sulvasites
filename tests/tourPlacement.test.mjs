import { test } from "node:test";
import assert from "node:assert/strict";
import { placeTooltip, SHEET_BREAKPOINT, GAP, MARGIN } from "../src/lib/tour/placement.ts";

const vp = { width: 1280, height: 800 };
const tip = { width: 320, height: 180 };

test("narrow viewport uses bottom sheet", () => {
  assert.deepEqual(placeTooltip({ top: 10, left: 10, width: 50, height: 20 }, tip, { width: SHEET_BREAKPOINT - 1, height: 800 }), { mode: "sheet" });
  assert.deepEqual(placeTooltip(null, tip, { width: 375, height: 800 }), { mode: "sheet" });
});

test("no target centers on desktop", () => {
  assert.deepEqual(placeTooltip(null, tip, vp), { mode: "center" });
});

test("prefers below the target, horizontally centered", () => {
  const p = placeTooltip({ top: 100, left: 500, width: 100, height: 40 }, tip, vp);
  assert.equal(p.side, "bottom");
  assert.equal(p.top, 100 + 40 + GAP);
  assert.equal(p.left, 550 - 160);
});

test("flips above when no room below", () => {
  const p = placeTooltip({ top: 700, left: 500, width: 100, height: 40 }, tip, vp);
  assert.equal(p.side, "top");
  assert.equal(p.top, 700 - GAP - 180);
});

test("clamps inside viewport near edges", () => {
  const p = placeTooltip({ top: 100, left: 0, width: 40, height: 40 }, tip, vp);
  assert.equal(p.left, MARGIN);
  const q = placeTooltip({ top: 100, left: 1260, width: 20, height: 40 }, tip, vp);
  assert.equal(q.left, 1280 - 320 - MARGIN);
});

test("huge target places tooltip inside, pinned to bottom", () => {
  const p = placeTooltip({ top: 0, left: 0, width: 1280, height: 800 }, tip, vp);
  assert.equal(p.side, "inside");
  assert.equal(p.top, 800 - 180 - MARGIN);
});
