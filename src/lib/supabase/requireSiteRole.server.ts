import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { isEmailExistsError, isUuid } from "../siteAccess";
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
  if (!isUuid(siteId)) return fail("Site not found.", 404);
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

export type FoundUser = { userId: string; email: string; mustChangePassword: boolean };

/** Looks up an existing auth user by email. Never creates. Null when none. */
export async function findUserByEmail(rawEmail: string): Promise<FoundUser | null> {
  const email = rawEmail.trim().toLowerCase();
  const service = supabaseService();

  // Indexed lookup (migration 007). Falls back to a bounded paged scan if it is not installed yet.
  const rpc = await service.rpc("find_user_id_by_email", { p_email: email });
  if (!rpc.error) {
    const row = (rpc.data as { user_id: string; must_change_password: boolean }[] | null)?.[0];
    return row ? { userId: row.user_id, email, mustChangePassword: Boolean(row.must_change_password) } : null;
  }
  console.error("find_user_id_by_email failed, using paged fallback:", rpc.error.message);

  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (found) {
      return {
        userId: found.id,
        email,
        mustChangePassword: Boolean(found.app_metadata?.must_change_password),
      };
    }
    if (data.users.length < perPage) break;
  }
  return null;
}

/**
 * ADMIN ROUTE ONLY. Creates the user with the shared default password (flagged
 * must_change_password); if the email is already registered, returns the existing user instead.
 * Never call this from an owner-facing route (pre-hijack risk: the temp password is shared).
 */
export async function findOrCreateUser(rawEmail: string): Promise<FoundUser & { created: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  const { data, error } = await supabaseService().auth.admin.createUser({
    email,
    password: defaultNewUserPassword(),
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });
  if (!error && data.user) {
    return { userId: data.user.id, email, mustChangePassword: true, created: true };
  }
  if (isEmailExistsError(error)) {
    const existing = await findUserByEmail(email);
    if (existing) return { ...existing, created: false };
  }
  throw new Error(error?.message ?? "Could not create user.");
}
