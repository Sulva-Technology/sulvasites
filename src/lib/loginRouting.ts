import type { SupabaseClient } from "@supabase/supabase-js";

import { postLoginRoute, type Membership, type SiteRole } from "./siteAccess";

/** Loads the signed-in user's memberships (RLS limits site_members rows to their own sites). */
export async function loadMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<Membership[]> {
  const { data, error } = await supabase
    .from("site_members")
    .select("site_id, role")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    siteId: m.site_id as string,
    role: m.role as SiteRole,
  }));
}

/** Resolves where to send the current session after sign-in. Call only with a live session. */
export async function resolvePostLoginRoute(supabase: SupabaseClient): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in.");
  const user = userData.user;

  const mustChangePassword = Boolean(user.app_metadata?.must_change_password);
  if (mustChangePassword) {
    return postLoginRoute({ isAdmin: false, mustChangePassword, memberships: [] });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw adminError;

  const memberships = isAdmin ? [] : await loadMemberships(supabase, user.id);
  return postLoginRoute({ isAdmin: Boolean(isAdmin), mustChangePassword, memberships });
}
