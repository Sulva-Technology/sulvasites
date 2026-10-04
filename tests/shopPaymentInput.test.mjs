import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAccountNumber,
  parseBankCode,
  parseBusinessName,
  parsePublicKey,
  parseSecretKey,
  keyEnvironment,
  parsePlatformFeeBps,
  parsePaymentSettingsBody,
  percentageChargeFromBps,
  last4,
} from "../src/lib/shop/paymentInput.ts";

const PK_TEST = "pk_test_" + "a1".repeat(20);
const SK_TEST = "sk_test_" + "b2".repeat(20);
const PK_LIVE = "pk_live_" + "c3".repeat(20);
const SK_LIVE = "sk_live_" + "d4".repeat(20);

test("account number must be exactly 10 digits (NUBAN)", () => {
  assert.deepEqual(parseAccountNumber("0123456789"), { ok: true, value: "0123456789" });
  assert.deepEqual(parseAccountNumber(" 0123456789 "), { ok: true, value: "0123456789" });
  for (const bad of ["123456789", "01234567890", "01234a6789", "", "0123 456789", null, undefined, 123456789, {}]) {
    assert.equal(parseAccountNumber(bad).ok, false, `expected reject: ${String(bad)}`);
  }
});

test("bank code: 1-10 alphanumeric chars", () => {
  assert.deepEqual(parseBankCode("058"), { ok: true, value: "058" });
  assert.deepEqual(parseBankCode(" 50211 "), { ok: true, value: "50211" });
  assert.equal(parseBankCode("12345678901").ok, false);
  assert.equal(parseBankCode("").ok, false);
  assert.equal(parseBankCode("05 8").ok, false);
  assert.equal(parseBankCode("058;drop").ok, false);
  assert.equal(parseBankCode(58).ok, false);
});

test("business name: trimmed, 2-100 chars, no control chars", () => {
  assert.deepEqual(parseBusinessName("  Ada Stores  "), { ok: true, value: "Ada Stores" });
  assert.equal(parseBusinessName("A").ok, false);
  assert.equal(parseBusinessName("x".repeat(101)).ok, false);
  assert.equal(parseBusinessName("x".repeat(100)).ok, true);
  assert.equal(parseBusinessName("Bad\u0000Name").ok, false);
  assert.equal(parseBusinessName(42).ok, false);
});

test("key formats", () => {
  assert.equal(parsePublicKey(PK_TEST).ok, true);
  assert.equal(parsePublicKey(PK_LIVE).ok, true);
  assert.equal(parseSecretKey(SK_TEST).ok, true);
  assert.equal(parseSecretKey(SK_LIVE).ok, true);
  // wrong prefix / swapped
  assert.equal(parsePublicKey(SK_TEST).ok, false);
  assert.equal(parseSecretKey(PK_TEST).ok, false);
  assert.equal(parseSecretKey("sk_prod_" + "a".repeat(40)).ok, false);
  assert.equal(parseSecretKey("sk_test_short").ok, false);
  assert.equal(parseSecretKey("sk_test_" + "a".repeat(40) + "!").ok, false);
  assert.equal(parseSecretKey(undefined).ok, false);
  // trimmed
  assert.deepEqual(parseSecretKey(`  ${SK_TEST}\n`), { ok: true, value: SK_TEST });
});

test("rejected secret key errors never echo the key", () => {
  const r = parseSecretKey("sk_test_short");
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes("sk_test_short"));
});

test("key environment", () => {
  assert.equal(keyEnvironment(PK_TEST), "test");
  assert.equal(keyEnvironment(SK_LIVE), "live");
  assert.equal(keyEnvironment("nope"), null);
});

test("platform fee bps bounds 0..10000 integer", () => {
  assert.deepEqual(parsePlatformFeeBps(0), { ok: true, value: 0 });
  assert.deepEqual(parsePlatformFeeBps(150), { ok: true, value: 150 });
  assert.deepEqual(parsePlatformFeeBps(10000), { ok: true, value: 10000 });
  for (const bad of [-1, 10001, 1.5, NaN, Infinity, "150", null]) {
    assert.equal(parsePlatformFeeBps(bad).ok, false, `expected reject: ${String(bad)}`);
  }
});

test("percentage charge from bps", () => {
  assert.equal(percentageChargeFromBps(0), 0);
  assert.equal(percentageChargeFromBps(150), 1.5);
  assert.equal(percentageChargeFromBps(10000), 100);
});

test("last4", () => {
  assert.equal(last4("0123456789"), "6789");
  assert.equal(last4(SK_TEST), SK_TEST.slice(-4));
});

test("body: platform mode", () => {
  const r = parsePaymentSettingsBody({
    mode: "platform",
    bankCode: "058",
    accountNumber: "0123456789",
    businessName: "Ada Stores",
  });
  assert.deepEqual(r, {
    ok: true,
    value: { platform: { bankCode: "058", accountNumber: "0123456789", businessName: "Ada Stores" } },
  });
});

test("body: own keys mode requires matching environments", () => {
  assert.deepEqual(parsePaymentSettingsBody({ mode: "own_keys", publicKey: PK_TEST, secretKey: SK_TEST }), {
    ok: true,
    value: { ownKeys: { publicKey: PK_TEST, secretKey: SK_TEST, environment: "test" } },
  });
  assert.equal(parsePaymentSettingsBody({ mode: "own_keys", publicKey: PK_LIVE, secretKey: SK_LIVE }).ok, true);
  const mixed = parsePaymentSettingsBody({ mode: "own_keys", publicKey: PK_TEST, secretKey: SK_LIVE });
  assert.equal(mixed.ok, false);
  assert.ok(!mixed.error.includes(SK_LIVE));
  assert.equal(parsePaymentSettingsBody({ mode: "own_keys", publicKey: PK_LIVE, secretKey: SK_TEST }).ok, false);
});

test("body: fee only, fee with mode, and invalid shapes", () => {
  assert.deepEqual(parsePaymentSettingsBody({ platformFeeBps: 250 }), { ok: true, value: { platformFeeBps: 250 } });
  const both = parsePaymentSettingsBody({
    mode: "platform",
    bankCode: "058",
    accountNumber: "0123456789",
    businessName: "Ada Stores",
    platformFeeBps: 100,
  });
  assert.equal(both.ok, true);
  assert.equal(both.value.platformFeeBps, 100);
  assert.equal(parsePaymentSettingsBody({ platformFeeBps: 10001 }).ok, false);
  assert.equal(parsePaymentSettingsBody({}).ok, false);
  assert.equal(parsePaymentSettingsBody(null).ok, false);
  assert.equal(parsePaymentSettingsBody([]).ok, false);
  assert.equal(parsePaymentSettingsBody({ mode: "bogus" }).ok, false);
  assert.equal(parsePaymentSettingsBody({ mode: "platform", bankCode: "058", accountNumber: "123" , businessName: "Ada" }).ok, false);
});
