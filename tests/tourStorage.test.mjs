import { test } from "node:test";
import assert from "node:assert/strict";
import { isTourDone, markTourDone, tourStorageKey } from "../src/lib/tour/storage.ts";

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
}
const throwing = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};

test("key format", () => {
  assert.equal(tourStorageKey("owner"), "sulva.tour.owner.done");
});

test("round trip", () => {
  const s = memoryStore();
  assert.equal(isTourDone("admin", s), false);
  markTourDone("admin", s);
  assert.equal(isTourDone("admin", s), true);
  assert.equal(isTourDone("owner", s), false);
});

test("blocked storage is treated as not done and never throws", () => {
  assert.equal(isTourDone("admin", throwing), false);
  assert.doesNotThrow(() => markTourDone("admin", throwing));
  assert.equal(isTourDone("admin", null), false);
  assert.doesNotThrow(() => markTourDone("admin", null));
});
