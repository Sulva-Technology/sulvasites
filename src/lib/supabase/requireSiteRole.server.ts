import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { defaultNewUserPassword, supabaseService } from "./admin.server";

export type ActorRole = "owner" | "staff" | "admin";

type SiteRoleCheck =
  | { ok: true; userId: string; role: ActorRole }
  | { ok: false; response: NextResponse };

function fail(error: string, status: number): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Verifies the bearer token and resolves the caller's role on one site
 * ("admin" for Sulvatech admins, else their site_members role).
 * 401 not signed in, 403 role not allowed, 404 unknown site (admins only; non-members get 403).
 */
export async function requireSiteRole(
  req: Request,
  siteId: string,
  roles: ActorRole[],
): Promise<SiteRoleCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fail("Supabase is not configured on the server.", 500);

  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail("Not signed in.", 401);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return fail("Session invalid or expired. Please log in again.", 401);
  }
  if (userData.user.app_metadata?.must_change_password) {
    return fail("Change your temporary password first.", 403);
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return fail("Could not verify access.", 500);

  let role: ActorRole | null = null;
  if (isAdmin) {
    role = "admin";
    const { data: site, error: siteError } = await supabaseService()
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) return fail("Could not verify site.", 500);
    if (!site) return fail("Site not found.", 404);
  } else {
    const { data: siteRole, error: roleError } = await supabase.rpc("site_role", {
      p_site: siteId,
    });
    if (roleError) return fail("Could not verify access.", 500);
    if (siteRole === "owner" || siteRole === "staff") role = siteRole;
  }

  if (!role || !roles.includes(role)) return fail("You do not have access to this site.", 403);
  return { ok: true, userId: userData.user.id, role };
}

/**
 * Finds an auth user by email, or creates one with the shared default password
 * (flagged must_change_password). Existing users are left untouched.
 */
export async function findOrCreateUser(
  rawEmail: string,
): Promise<{ userId: string; email: string; created: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  const service = supabaseService();

  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (found) return { userId: found.id, email, created: false };
    if (data.users.length < perPage) break;
  }

  const { data, error } = await service.auth.admin.createUser({
    email,
    password: defaultNewUserPassword(),
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user.");
  return { userId: data.user.id, email, created: true };
}
