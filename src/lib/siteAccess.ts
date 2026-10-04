// Relative-import-safe pure helpers for site membership rules.
export type SiteRole = "owner" | "staff";
export type Membership = { siteId: string; role: SiteRole };
export type DashboardTab = "overview" | "content" | "inbox" | "business" | "team";

export function postLoginRoute(i: { isAdmin: boolean; mustChangePassword: boolean; memberships: Membership[] }): string {
  if (i.mustChangePassword) return "/change-password";
  if (i.isAdmin) return "/admin/sites";
  if (i.memberships.length === 1) return `/dashboard/${i.memberships[0]!.siteId}`;
  if (i.memberships.length > 1) return "/dashboard";
  return "/no-access";
}

export function tabsForRole(role: SiteRole | "admin"): DashboardTab[] {
  return role === "staff" ? ["overview", "inbox", "business"] : ["overview", "content", "inbox", "business", "team"];
}

export function canInvite(actor: SiteRole | "admin", target: SiteRole): boolean {
  if (actor === "admin") return true;
  return actor === "owner" && target === "staff";
}

export function canRemove(
  actor: SiteRole | "admin",
  target: { role: SiteRole; userId: string },
  ctx: { actorId: string; ownerCount: number },
): { ok: true } | { ok: false; reason: string } {
  if (actor === "staff") return { ok: false, reason: "Only owners can remove team members." };
  if (actor === "owner" && target.role === "owner") return { ok: false, reason: "Only Sulvatech can remove an owner." };
  if (target.role === "owner" && ctx.ownerCount <= 1) return { ok: false, reason: "A site needs at least one owner." };
  return { ok: true };
}
