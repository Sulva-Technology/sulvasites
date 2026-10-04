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

test("verifyPaystackSignature is case-insensitive on hex", () => {
  const body = '{"a":1}';
  assert.equal(verifyPaystackSignature(body, sign(body, "sk").toUpperCase(), "sk"), true);
});

test("verifyPaystackSignature rejects bad secret/signature types without throwing", () => {
  const body = "{}";
  const good = sign(body, "sk");
  assert.equal(verifyPaystackSignature(body, good, ""), false);
  assert.equal(verifyPaystackSignature(body, good, undefined), false);
  assert.equal(verifyPaystackSignature(body, good, 123), false);
  assert.equal(verifyPaystackSignature(body, 123, "sk"), false);
  assert.equal(verifyPaystackSignature(body, ["x"], "sk"), false);
  assert.equal(verifyPaystackSignature(body, "₦".repeat(good.length), "sk"), false);
  assert.equal(verifyPaystackSignature(body, "é" + good.slice(1), "sk"), false);
  assert.equal(verifyPaystackSignature(body, good.slice(0, -1), "sk"), false);
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

test("secretBox tampered IV and truncated tag throw", () => {
  const key = newKey();
  const [v, iv, tag, data] = encryptSecret("hello world", key).split(":");
  const ib = Buffer.from(iv, "base64");
  ib[0] ^= 0xff;
  assert.throws(() => decryptSecret([v, ib.toString("base64"), tag, data].join(":"), key));
  const short = Buffer.from(tag, "base64").subarray(0, 8).toString("base64");
  assert.throws(() => decryptSecret([v, iv, short, data].join(":"), key));
});

test("secretBox strict key validation", () => {
  const k33 = crypto.randomBytes(33).toString("base64");
  const good = newKey();
  assert.throws(() => encryptSecret("x", k33));
  assert.throws(() => decryptSecret(encryptSecret("x", good), k33));
  assert.throws(() => encryptSecret("x", good.slice(0, 10) + "!!!" + good.slice(13)));
  assert.throws(() => encryptSecret("x", good.replace("=", "")));
  assert.throws(() => encryptSecret("x", good + "\n"));
  assert.throws(() => encryptSecret("x", ""));
  assert.throws(() => encryptSecret("x", undefined));
});

test("secretBox errors do not leak key or plaintext", () => {
  const key = newKey();
  const box = encryptSecret("super-secret-plain", key);
  for (const fn of [() => decryptSecret(box, newKey()), () => encryptSecret("super-secret-plain", key.slice(1))]) {
    try { fn(); assert.fail("should throw"); } catch (e) {
      assert.ok(!String(e.message).includes(key));
      assert.ok(!String(e.message).includes("super-secret-plain"));
    }
  }
});

test("secretBox AAD match and mismatch", () => {
  const key = newKey();
  const box = encryptSecret("sk", key, "site-1");
  assert.equal(decryptSecret(box, key, "site-1"), "sk");
  assert.throws(() => decryptSecret(box, key, "site-2"));
  assert.throws(() => decryptSecret(box, key));
  assert.throws(() => decryptSecret(encryptSecret("sk", key), key, "site-1"));
  assert.equal(decryptSecret(encryptSecret("sk", key), key), "sk");
});

test("secretBox wrong key / malformed box / bad key length throws", () => {
  const box = encryptSecret("hello", newKey());
  assert.throws(() => decryptSecret(box, newKey()));
  assert.throws(() => decryptSecret("garbage", newKey()));
  assert.throws(() => decryptSecret("v2:a:b:c", newKey()));
  assert.throws(() => encryptSecret("x", crypto.randomBytes(16).toString("base64")));
  assert.throws(() => decryptSecret(box, "short"));
});
