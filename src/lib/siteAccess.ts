// Relative-import-safe pure helpers for site membership rules.
export type SiteRole = "owner" | "staff";
export type Membership = { siteId: string; role: SiteRole };
export type DashboardTab = "overview" | "content" | "inbox" | "business" | "insights" | "team" | "shop";

/** `hostSiteId`: signing in on a site's own address lands on that site's admin / dashboard. */
export function postLoginRoute(i: {
  isAdmin: boolean;
  mustChangePassword: boolean;
  memberships: Membership[];
  hostSiteId?: string | null;
}): string {
  if (i.mustChangePassword) return "/change-password";
  if (i.hostSiteId) {
    if (i.isAdmin) return `/admin/sites/${i.hostSiteId}`;
    if (i.memberships.some((m) => m.siteId === i.hostSiteId)) return `/dashboard/${i.hostSiteId}`;
  }
  if (i.isAdmin) return "/admin/sites";
  if (i.memberships.length === 1) return `/dashboard/${i.memberships[0]!.siteId}`;
  if (i.memberships.length > 1) return "/dashboard";
  return "/no-access";
}

/** Tabs for a role. `shop` adds the Shop tab (templates with a shop); staff get it too, limited to orders. */
export function tabsForRole(
  role: SiteRole | "admin",
  opts: { shop?: boolean; business?: boolean } = {},
): DashboardTab[] {
  let tabs: DashboardTab[] =
    role === "staff"
      ? ["overview", "inbox", "business"]
      : ["overview", "content", "inbox", "business", "insights", "team"];
  // Templates without business managers (shop templates) have nothing to show under Business.
  if (opts.business === false) tabs = tabs.filter((t) => t !== "business");
  if (opts.shop) tabs.splice(role === "staff" ? 1 : 2, 0, "shop");
  return tabs;
}

/** Insights (site analytics, shop revenue): owners and Sulvatech admins only; staff do not see them. */
export function canViewInsights(role: SiteRole | "admin" | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Business data managers (menu, timetable...): owners, staff and Sulvatech admins may read and write. */
export function canManageBusinessData(role: SiteRole | "admin" | null | undefined): boolean {
  return role === "owner" || role === "staff" || role === "admin";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** Supabase auth admin createUser error meaning the email is already registered. */
export function isEmailExistsError(e: { code?: string; status?: number; message?: string } | null | undefined): boolean {
  if (!e) return false;
  if (e.code === "email_exists" || e.code === "user_already_exists") return true;
  return /already (been )?registered|already exists/i.test(e.message ?? "");
}

/** Postgres SQLSTATE raised by the site_members last-owner trigger (migration 007). */
export const LAST_OWNER_SQLSTATE = "SM001";
