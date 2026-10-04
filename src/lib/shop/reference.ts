import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RANDOM_LEN = 6;

/** `SV-<base36 time, upper>-<6 random A-Z0-9>`. Also used as the Paystack transaction reference. */
export const ORDER_REFERENCE_RE = /^SV-[0-9A-Z]{6,12}-[0-9A-Z]{6}$/;

export function newOrderReference(
  now: number = Date.now(),
  rand: (max: number) => number = (max) => randomInt(max),
): string {
  const t = Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
  const time = t.toString(36).toUpperCase().padStart(6, "0");
  let suffix = "";
  for (let i = 0; i < RANDOM_LEN; i++) suffix += ALPHABET[rand(ALPHABET.length)];
  return `SV-${time}-${suffix}`;
}

export function isOrderReference(v: unknown): v is string {
  return typeof v === "string" && ORDER_REFERENCE_RE.test(v);
}
