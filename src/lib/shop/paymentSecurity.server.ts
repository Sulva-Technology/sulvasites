import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isValidEmail } from "@/lib/inbox/input";
import { sendResend } from "@/lib/inbox/notify";
import { supabaseService } from "@/lib/supabase/admin.server";
import { buildPaymentChangeEmail, notificationRecipients, type PaymentChangeNotice } from "./paymentNotify";

export type PasswordCheck = "ok" | "wrong" | "error";

/**
 * Re-confirms a user's password with a throwaway anon client (no session persisted, nothing
 * shared with the caller's session). The password is never logged or returned.
 */
export async function verifyUserPassword(email: string, password: string): Promise<PasswordCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !isValidEmail(email)) return "error";
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data.session) return "ok";
    if (error && (error.code === "invalid_credentials" || error.status === 400)) return "wrong";
    return "error";
  } catch {
    return "error";
  }
}

export type AuditEntry = {
  siteId: string;
  actorId: string;
  actorRole: "admin" | "owner";
  action: "bank_changed" | "keys_set" | "keys_removed" | "fee_changed";
  /** Non-secret facts only (bank name, account last4, fee bps). */
  detail: Record<string, unknown>;
};

/** Writes a shop_audit_log row (migration 010). Soft-fails: logs only the error code. */
export async function writeAuditLog(db: SupabaseClient, e: AuditEntry): Promise<void> {
  try {
    const { error } = await db.from("shop_audit_log").insert({
      site_id: e.siteId,
      actor_id: e.actorId,
      actor_role: e.actorRole,
      action: e.action,
      detail: e.detail,
    });
    if (error) console.error("[shop/payment] audit log failed", error.code ?? "unknown");
  } catch {
    console.error("[shop/payment] audit log failed");
  }
}

/** Login emails of the site's owners (capped). Soft-fails to an empty list. */
async function ownerLoginEmails(siteId: string): Promise<string[]> {
  try {
    const service = supabaseService();
    const { data, error } = await service
      .from("site_members")
      .select("user_id")
      .eq("site_id", siteId)
      .eq("role", "owner")
      .limit(5);
    if (error || !data) return [];
    const emails: string[] = [];
    for (const row of data as { user_id: string }[]) {
      const { data: u } = await service.auth.admin.getUserById(row.user_id);
      if (u?.user?.email) emails.push(u.user.email);
    }
    return emails;
  } catch {
    return [];
  }
}

/**
 * Emails the site's contact email and its owners' login emails about a bank/key change.
 * Resend REST via RESEND_API_KEY / RESEND_FROM. Soft-fails (never throws, never blocks the change).
 */
export async function notifyPaymentChange(
  siteId: string,
  contactEmail: string | null,
  notice: PaymentChangeNotice,
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    if (!apiKey || !from) {
      console.warn("[shop/payment] change notification skipped: RESEND_API_KEY / RESEND_FROM not set");
      return;
    }
    const recipients = notificationRecipients([contactEmail, ...(await ownerLoginEmails(siteId))]);
    const mail = buildPaymentChangeEmail(notice);
    const results = await Promise.all(recipients.map((to) => sendResend({ apiKey, from, to }, mail)));
    if (results.some((ok) => !ok)) console.warn("[shop/payment] some change notifications failed to send");
  } catch {
    console.warn("[shop/payment] change notification failed");
  }
}
