import { sitemapResponse } from "@/lib/search/siteFiles.server";
import { siteForHostname } from "@/lib/search/siteHosts.server";

export async function GET(_req: Request, { params }: { params: Promise<{ hostname: string }> }) {
  const { hostname } = await params;
  return sitemapResponse(await siteForHostname(hostname));
}
