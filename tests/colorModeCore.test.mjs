import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMode } from "../src/templates/shared/colorModeCore.ts";

test("saved choice always wins", () => {
  assert.equal(resolveMode("light", true, "dark"), "light");
  assert.equal(resolveMode("dark", false), "dark");
});

test("template fallback beats system preference", () => {
  assert.equal(resolveMode(null, false, "dark"), "dark");
  assert.equal(resolveMode(null, true, "light"), "light");
});

test("no fallback follows system", () => {
  assert.equal(resolveMode(null, true), "dark");
  assert.equal(resolveMode(null, false), "light");
});
