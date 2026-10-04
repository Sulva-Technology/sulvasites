import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_RE = /^[A-Za-z0-9+/]{43}=$/;

function keyFrom(keyB64: string): Buffer {
  if (typeof keyB64 !== "string" || !KEY_RE.test(keyB64)) throw new Error("Invalid shop secrets key");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("Invalid shop secrets key");
  return key;
}

/** `aad` binds the ciphertext to a context (e.g. site id); decrypt must pass the same value. */
export function encryptSecret(plain: string, keyB64: string, aad?: string): string {
  const key = keyFrom(keyB64);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, "utf8"));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(box: string, keyB64: string, aad?: string): string {
  const key = keyFrom(keyB64);
  const parts = typeof box === "string" ? box.split(":") : [];
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid secret box");
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid secret box");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    if (aad !== undefined) decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Secret decryption failed");
  }
}
