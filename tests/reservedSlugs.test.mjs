import { test } from "node:test";
import assert from "node:assert/strict";

import { RESERVED_SLUGS, isReservedSlug, safeSlug } from "../src/lib/reservedSlugs.ts";

test("marketing routes are reserved", () => {
  for (const s of ["pricing", "templates", "signup", "start", "admin", "dashboard", "api", "login"]) assert.ok(isReservedSlug(s), s);
  assert.equal(isReservedSlug("adas-kitchen"), false);
  assert.ok(RESERVED_SLUGS.length >= 20);
});

test("safeSlug slugifies and steps around reserved names", () => {
  assert.equal(safeSlug("Ada's Kitchen!"), "adas-kitchen");
  assert.equal(safeSlug("Pricing"), "pricing-site");
  assert.equal(safeSlug("   "), "my-site");
  assert.equal(safeSlug("", "fallback"), "fallback");
});
