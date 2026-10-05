import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS and can manage auth users — server-side only,
 * never import from a client component.
 */
export function supabaseService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Shared first-login password for newly created users (set in server env). */
export function defaultNewUserPassword(): string {
  const pw = process.env.DEFAULT_NEW_USER_PASSWORD;
  if (!pw) throw new Error("Missing DEFAULT_NEW_USER_PASSWORD on the server.");
  return pw;
}
