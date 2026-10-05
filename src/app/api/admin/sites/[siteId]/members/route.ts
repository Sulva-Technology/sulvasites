import { addMember, listMembers, removeMember } from "@/lib/siteMembers.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

// Sulvatech admins only; also 404s for unknown sites.
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  return listMembers(siteId);
}

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`members:${auth.userId}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  return addMember(req, siteId, auth);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`members:${auth.userId}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  return removeMember(req, siteId, auth);
}
