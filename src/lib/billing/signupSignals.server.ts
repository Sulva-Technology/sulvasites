import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PriorSignals } from "@/lib/billing/signupGuard";

export function hashSignal(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}

export type SignalKeys = {
  emailKey: string | null;
  phoneKey: string | null;
  deviceHash: string;
  ipHash: string;
  businessKey: string;
};

export async function collectPriorSignals(db: SupabaseClient, k: SignalKeys): Promise<PriorSignals> {
  const count = async (col: string, val: string | null, sinceMs?: number): Promise<number> => {
    if (!val) return 0;
    let q = db.from("signup_signals").select("id", { count: "exact", head: true }).eq(col, val);
    if (sinceMs) q = q.gte("created_at", new Date(Date.now() - sinceMs).toISOString());
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const [emailTrials, phoneTrials, deviceTrials, businessMatches, ipLastHour, ipLastDay] = await Promise.all([
    count("normalized_email", k.emailKey),
    count("phone_e164", k.phoneKey),
    count("device_hash", k.deviceHash),
    count("business_key", k.businessKey),
    count("ip_hash", k.ipHash, 60 * 60_000),
    count("ip_hash", k.ipHash, 24 * 60 * 60_000),
  ]);
  return { emailTrials, phoneTrials, deviceTrials, businessMatches, ipLastHour, ipLastDay };
}

export async function recordSignupSignal(
  db: SupabaseClient,
  row: SignalKeys & { userId: string; siteId: string; flags: string[] },
): Promise<boolean> {
  const { error } = await db.from("signup_signals").insert({
    user_id: row.userId,
    site_id: row.siteId,
    normalized_email: row.emailKey,
    phone_e164: row.phoneKey,
    device_hash: row.deviceHash,
    ip_hash: row.ipHash,
    business_key: row.businessKey,
    flags: row.flags,
  });
  if (error) {
    console.error("[signup] signal insert failed", error.message);
    return false;
  }
  return true;
}
