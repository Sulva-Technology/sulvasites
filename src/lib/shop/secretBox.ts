import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFrom(keyB64: string): Buffer {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("SHOP_SECRETS_KEY must be 32 bytes (base64)");
  return key;
}

export function encryptSecret(plain: string, keyB64: string): string {
  const key = keyFrom(keyB64);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(box: string, keyB64: string): string {
  const key = keyFrom(keyB64);
  const parts = box.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid secret box");
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid secret box");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
