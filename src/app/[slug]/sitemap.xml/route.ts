import { sitemapResponse } from "@/lib/search/siteFiles.server";
import { siteForSlug } from "@/lib/search/siteHosts.server";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return sitemapResponse(await siteForSlug(slug));
}
