import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";

import { buildJwt, parseServiceAccount } from "../src/lib/search/googleJwt.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const sa = { client_email: "bot@proj.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

test("buildJwt signs RS256 claims for Google's token endpoint", () => {
  const jwt = buildJwt(sa, ["scope/a", "scope/b"], 1_000_000);
  const [h, c, s] = jwt.split(".");
  assert.deepEqual(decode(h), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(decode(c), {
    iss: sa.client_email,
    scope: "scope/a scope/b",
    aud: "https://oauth2.googleapis.com/token",
    iat: 1_000_000,
    exp: 1_003_600,
  });
  const v = createVerify("RSA-SHA256");
  v.update(`${h}.${c}`);
  assert.ok(v.verify(publicKey, Buffer.from(s, "base64url")));
});

test("parseServiceAccount decodes base64 JSON and rejects junk", () => {
  const b64 = Buffer.from(JSON.stringify({ ...sa, type: "service_account" })).toString("base64");
  assert.equal(parseServiceAccount(b64)?.client_email, sa.client_email);
  assert.equal(parseServiceAccount("not base64 json"), null);
  assert.equal(parseServiceAccount(Buffer.from('{"client_email":"x"}').toString("base64")), null);
});
