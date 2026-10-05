import { createHash } from "node:crypto";

/** UTC calendar day (yyyy-mm-dd) used as the daily salt component. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Anonymous visitor id: sha256(secret | day | site | ip | ua) cut to 32 hex chars. The day is part of
 * the input so the id rotates every UTC day and cannot link a person across days. Raw ip/ua are never stored.
 */
export function visitorHash(secret: string, day: string, siteId: string, ip: string, ua: string): string {
  return createHash("sha256")
    .update([secret, day, siteId, ip, ua].join("\u0000"))
    .digest("hex")
    .slice(0, 32);
}
