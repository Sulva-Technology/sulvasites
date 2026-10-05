import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizePaymentChange, isSensitiveChange, readPassword } from "../src/lib/shop/paymentAuth.ts";
import { buildPaymentChangeEmail, notificationRecipients } from "../src/lib/shop/paymentNotify.ts";

const platform = { platform: { bankCode: "058", accountNumber: "0123456789", businessName: "Shop" } };
const ownKeys = { ownKeys: { publicKey: "pk_test_x", secretKey: "sk_test_abcd1234", environment: "test" } };

test("admin: everything allowed, no password", () => {
  assert.deepEqual(authorizePaymentChange("admin", { kind: "update", input: { ...platform, platformFeeBps: 100 } }), {
    ok: true, needsPassword: false, sensitive: true,
  });
});

test("owner: bank/keys/remove need password", () => {
  for (const change of [
    { kind: "update", input: platform },
    { kind: "update", input: ownKeys },
    { kind: "remove_keys" },
  ]) {
    assert.deepEqual(authorizePaymentChange("owner", change), { ok: true, needsPassword: true, sensitive: true });
  }
});

test("owner: platform fee rejected, even alongside other changes", () => {
  const a = authorizePaymentChange("owner", { kind: "update", input: { platformFeeBps: 0 } });
  assert.equal(a.ok, false);
  assert.equal(a.status, 403);
  const b = authorizePaymentChange("owner", { kind: "update", input: { ...platform, platformFeeBps: 50 } });
  assert.equal(b.ok, false);
});

test("isSensitiveChange: fee-only is not sensitive", () => {
  assert.equal(isSensitiveChange({ kind: "update", input: { platformFeeBps: 10 } }), false);
  assert.equal(isSensitiveChange({ kind: "remove_keys" }), true);
});

test("readPassword", () => {
  assert.equal(readPassword({ password: "hunter2" }), "hunter2");
  assert.equal(readPassword({ password: "" }), null);
  assert.equal(readPassword({ password: 5 }), null);
  assert.equal(readPassword({}), null);
  assert.equal(readPassword(null), null);
  assert.equal(readPassword([]), null);
  assert.equal(readPassword({ password: "x".repeat(300) }), null);
});

test("notification email has no key material and escapes html", () => {
  const m = buildPaymentChangeEmail({
    siteName: "Bob's <b>Shop</b>\nX",
    kind: "bank_changed",
    actorLabel: "A shop owner",
    actorEmail: "o@example.com",
    bank: "GTBank",
    accountLast4: "6789",
    whenIso: "2026-10-05T10:00:00.000Z",
  });
  assert.match(m.subject, /Payment settings changed/);
  assert.ok(!m.subject.includes("\n"));
  assert.match(m.text, /ending 6789 at GTBank/);
  assert.ok(!m.html.includes("<b>Shop"));
  assert.ok(!/sk_|pk_/.test(m.text + m.html));
  const k = buildPaymentChangeEmail({
    siteName: "S", kind: "keys_set", actorLabel: "Sulvatech", actorEmail: null, bank: null, accountLast4: null, whenIso: "t",
  });
  assert.match(k.text, /API keys were saved or replaced/);
  assert.match(k.text, /Changed by: Sulvatech\n/);
});

test("notificationRecipients dedupes and drops invalid", () => {
  assert.deepEqual(
    notificationRecipients(["A@x.com", "a@x.com ", null, "nope", "b@y.org", undefined, "c d@x.com"]),
    ["a@x.com", "b@y.org"],
  );
});
