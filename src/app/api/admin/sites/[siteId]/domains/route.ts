import { checkDomain, connectDomain, removeDomain } from "@/lib/customDomains.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

// Sulvatech admins only: these attach hostnames to the shared Vercel project.
async function authorise(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["admin"]);
  if (!auth.ok) return { siteId, response: auth.response };
  const limited = rateLimit(`domains:${auth.userId}`, { limit: 60, windowMs: 10 * 60 * 1000 });
  return { siteId, response: limited };
}

/** Connect { hostname }. */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId, response } = await authorise(req, ctx);
  return response ?? connectDomain(req, siteId);
}

/** Re-check { domainId } with Vercel. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { siteId, response } = await authorise(req, ctx);
  return response ?? checkDomain(req, siteId);
}

/** Remove { domainId }. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { siteId, response } = await authorise(req, ctx);
  return response ?? removeDomain(req, siteId);
}
