import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyPaystackSignature } from "../src/lib/shop/paystackSignature.ts";
import { encryptSecret, decryptSecret } from "../src/lib/shop/secretBox.ts";

const sign = (body, secret) => crypto.createHmac("sha512", secret).update(body).digest("hex");

test("verifyPaystackSignature accepts valid signature", () => {
  const body = '{"event":"charge.success","data":{"reference":"abc"}}';
  assert.equal(verifyPaystackSignature(body, sign(body, "sk_test_x"), "sk_test_x"), true);
});

test("verifyPaystackSignature rejects invalid, wrong secret, tampered body", () => {
  const body = '{"a":1}';
  const good = sign(body, "sk");
  assert.equal(verifyPaystackSignature(body, "0".repeat(good.length), "sk"), false);
  assert.equal(verifyPaystackSignature(body, good, "other"), false);
  assert.equal(verifyPaystackSignature(body + " ", good, "sk"), false);
});

test("verifyPaystackSignature null/empty header", () => {
  assert.equal(verifyPaystackSignature("{}", null, "sk"), false);
  assert.equal(verifyPaystackSignature("{}", "", "sk"), false);
});

test("verifyPaystackSignature length mismatch does not throw", () => {
  assert.doesNotThrow(() => verifyPaystackSignature("{}", "abcd", "sk"));
  assert.equal(verifyPaystackSignature("{}", "abcd", "sk"), false);
  assert.equal(verifyPaystackSignature("{}", sign("{}", "sk") + "00", "sk"), false);
});

const newKey = () => crypto.randomBytes(32).toString("base64");

test("secretBox round trip and format", () => {
  const key = newKey();
  const box = encryptSecret("sk_live_secret", key);
  assert.match(box, /^v1:[^:]+:[^:]+:[^:]+$/);
  assert.equal(box.split(":").length, 4);
  assert.equal(Buffer.from(box.split(":")[1], "base64").length, 12);
  assert.equal(decryptSecret(box, key), "sk_live_secret");
  assert.equal(decryptSecret(encryptSecret("", key), key), "");
  assert.equal(decryptSecret(encryptSecret("₦ünï", key), key), "₦ünï");
});

test("secretBox uses fresh IV each time", () => {
  const key = newKey();
  assert.notEqual(encryptSecret("x", key), encryptSecret("x", key));
});

test("secretBox tamper throws", () => {
  const key = newKey();
  const [v, iv, tag, data] = encryptSecret("hello world", key).split(":");
  const buf = Buffer.from(data, "base64");
  buf[0] ^= 0xff;
  assert.throws(() => decryptSecret([v, iv, tag, buf.toString("base64")].join(":"), key));
  const tbuf = Buffer.from(tag, "base64");
  tbuf[0] ^= 0xff;
  assert.throws(() => decryptSecret([v, iv, tbuf.toString("base64"), data].join(":"), key));
});

test("secretBox wrong key / malformed box / bad key length throws", () => {
  const box = encryptSecret("hello", newKey());
  assert.throws(() => decryptSecret(box, newKey()));
  assert.throws(() => decryptSecret("garbage", newKey()));
  assert.throws(() => decryptSecret("v2:a:b:c", newKey()));
  assert.throws(() => encryptSecret("x", crypto.randomBytes(16).toString("base64")));
  assert.throws(() => decryptSecret(box, "short"));
});
