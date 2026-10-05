import { NextResponse } from "next/server";

import { canInvite, canRemove, type SiteRole } from "./siteAccess";
import { supabaseService } from "./supabase/admin.server";
import { findOrCreateUser, type ActorRole } from "./supabase/requireSiteRole.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function isRole(v: unknown): v is SiteRole {
  return v === "owner" || v === "staff";
}

/** Shared by the admin and owner member routes. Callers have already authorised the actor. */
export async function listMembers(siteId: string) {
  try {
    const service = supabaseService();
    const { data, error } = await service
      .from("site_members")
      .select("user_id, role, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: true });
    if (error) return json({ error: "Could not load team." }, 500);

    const members = await Promise.all(
      (data ?? []).map(async (m) => {
        const { data: u } = await service.auth.admin.getUserById(m.user_id as string);
        return {
          userId: m.user_id as string,
          email: u?.user?.email ?? "",
          role: m.role as SiteRole,
          createdAt: m.created_at as string,
        };
      }),
    );
    return json({ members });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not load team." }, 500);
  }
}

export async function addMember(
  req: Request,
  siteId: string,
  actor: { role: ActorRole; userId: string },
) {
  let email = "";
  let role: unknown;
  try {
    const body = (await req.json()) as { email?: string; role?: unknown };
    email = (body.email ?? "").trim().toLowerCase();
    role = body.role;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (!isRole(role)) return json({ error: "Role must be owner or staff." }, 400);
  if (!canInvite(actor.role, role)) {
    return json({ error: "You cannot invite that role." }, 403);
  }

  try {
    const service = supabaseService();
    const user = await findOrCreateUser(email);

    const { data: existing } = await service
      .from("site_members")
      .select("user_id")
      .eq("site_id", siteId)
      .eq("user_id", user.userId)
      .maybeSingle();
    if (existing) {
      return json({ error: "That person is already a member of this site." }, 409);
    }

    const { error } = await service.from("site_members").insert({
      site_id: siteId,
      user_id: user.userId,
      role,
      invited_by: actor.userId,
    });
    if (error) {
      if (error.code === "23505") {
        return json({ error: "That person is already a member of this site." }, 409);
      }
      return json({ error: "Could not add member." }, 500);
    }
    return json({ userId: user.userId, email: user.email, role, created: user.created });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not add member." }, 500);
  }
}

export async function removeMember(
  req: Request,
  siteId: string,
  actor: { role: ActorRole; userId: string },
) {
  let userId = "";
  try {
    const body = (await req.json()) as { userId?: string };
    userId = (body.userId ?? "").trim();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  if (!userId) return json({ error: "userId is required." }, 400);

  try {
    const service = supabaseService();
    const { data: rows, error } = await service
      .from("site_members")
      .select("user_id, role")
      .eq("site_id", siteId);
    if (error) return json({ error: "Could not load team." }, 500);

    const target = (rows ?? []).find((r) => r.user_id === userId);
    if (!target) return json({ error: "Member not found." }, 404);
    const ownerCount = (rows ?? []).filter((r) => r.role === "owner").length;

    const check = canRemove(
      actor.role,
      { role: target.role as SiteRole, userId },
      { actorId: actor.userId, ownerCount },
    );
    if (!check.ok) {
      // Last-owner removal by an admin is a 400; role violations are 403.
      const lastOwner = target.role === "owner" && actor.role === "admin";
      return json({ error: check.reason }, lastOwner ? 400 : 403);
    }

    const { error: delError } = await service
      .from("site_members")
      .delete()
      .eq("site_id", siteId)
      .eq("user_id", userId);
    if (delError) return json({ error: "Could not remove member." }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not remove member." }, 500);
  }
}
