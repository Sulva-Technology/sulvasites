import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin site ownership (migration 012): admins manage only the sites they created; super admins
 * manage every site and the admin list. RLS enforces this for writes and private rows. These helpers
 * keep the UI and server routes consistent, since published sites stay publicly readable.
 *
 * Until 012 is installed the RPCs do not exist; every admin then keeps the pre-012 behaviour
 * (full access), so deploying the app before running the migration breaks nothing.
 */

function isMissingFunction(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}

/** True when the signed-in user is a super admin (or 012 is not installed yet). */
export async function isSuperAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) {
    if (isMissingFunction(error)) return true;
    throw error;
  }
  return Boolean(data);
}

/** True when the signed-in user is a super admin or the admin who created this site. */
export async function canAdminSite(supabase: SupabaseClient, siteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_site_admin", { p_site: siteId });
  if (error) {
    if (isMissingFunction(error)) {
      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
      if (adminError) throw adminError;
      return Boolean(isAdmin);
    }
    throw error;
  }
  return Boolean(data);
}
