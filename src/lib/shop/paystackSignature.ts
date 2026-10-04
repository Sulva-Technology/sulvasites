import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  try {
    if (typeof signature !== "string" || signature === "") return false;
    if (typeof secret !== "string" || secret === "") return false;
    if (typeof rawBody !== "string") return false;
    const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"), "utf8");
    const given = Buffer.from(signature.toLowerCase(), "utf8");
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}
