import { test } from "node:test";
import assert from "node:assert/strict";

import { validateNewPassword } from "../src/lib/passwordPolicy.ts";

test("rejects short passwords", () => {
  assert.match(validateNewPassword("abc123"), /at least 10/);
});

test("rejects the default password", () => {
  assert.match(validateNewPassword("Default1234!", "Default1234!"), /different/);
});

test("requires a letter and a number", () => {
  assert.match(validateNewPassword("abcdefghijkl"), /letter and one number/);
  assert.match(validateNewPassword("1234567890123"), /letter and one number/);
});

test("accepts a good password", () => {
  assert.equal(validateNewPassword("correct-horse-42", "Default1234!"), null);
});
