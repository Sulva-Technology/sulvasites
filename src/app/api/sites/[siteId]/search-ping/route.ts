import { refreshSite } from "@/lib/search/searchIndex.server";
import { requireServiceClient } from "@/lib/shop/serviceClient.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };

/**
 * Fire-and-forget after a publish: push the site's changed URLs to IndexNow now instead of at the next
 * cron. Google work stays with the cron. Always 204 for members; a failure only delays the push.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner", "staff", "admin"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`search-ping:${siteId}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const db = requireServiceClient();
  if (db) {
    try {
      await refreshSite(db, siteId, { google: false });
    } catch (err) {
      console.error("[search] ping failed", { site_id: siteId, error: err instanceof Error ? err.message : "error" });
    }
  }
  return new Response(null, { status: 204 });
}
