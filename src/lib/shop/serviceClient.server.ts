import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "../supabase/server";

export const SHOP_NOT_CONFIGURED = "Shop payments are not configured";

/**
 * Service-role Supabase client for shop payment code. Returns null when the service role key
 * is missing, so callers fail closed (500) instead of silently falling back to the anon key.
 */
export function requireServiceClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return supabaseServer();
}
