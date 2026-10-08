import { test } from "node:test";
import assert from "node:assert/strict";

import { businessKey, isDisposableEmail, normalizeEmail, normalizePhoneNg } from "../src/lib/billing/identity.ts";

test("normalizeEmail", () => {
  assert.equal(normalizeEmail("  Ada.Okafor+shop@Gmail.com "), "adaokafor@gmail.com");
  assert.equal(normalizeEmail("a.b@googlemail.com"), "ab@gmail.com");
  assert.equal(normalizeEmail("ada.okafor+x@yahoo.com"), "ada.okafor@yahoo.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("+tag@gmail.com"), null);
  assert.equal(normalizeEmail(7), null);
});

test("disposable domains, including subdomains", () => {
  assert.equal(isDisposableEmail("x@mailinator.com"), true);
  assert.equal(isDisposableEmail("x@eu.mailinator.com"), true);
  assert.equal(isDisposableEmail("x@gmail.com"), false);
});

test("normalizePhoneNg", () => {
  for (const raw of ["08031234567", "+2348031234567", "2348031234567", "+234 0803 123 4567", "00234 803 123 4567", "803-123-4567"]) {
    assert.equal(normalizePhoneNg(raw), "+2348031234567", raw);
  }
  assert.equal(normalizePhoneNg("0603123456"), null);
  assert.equal(normalizePhoneNg("+447700900123"), null);
  assert.equal(normalizePhoneNg(""), null);
});

test("businessKey ignores case, punctuation and spacing", () => {
  assert.equal(businessKey("Ada's  Kitchen", " Lagos "), businessKey("adas kitchen", "LAGOS"));
  assert.notEqual(businessKey("Ada's Kitchen", "Lagos"), businessKey("Ada's Kitchen", "Abuja"));
});
