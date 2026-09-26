import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicSitePage from "@/components/site/PublicSitePage";
import { buildSiteMetadata, loadPublicSite, type PublicPage } from "@/lib/publicSite.server";

type Params = Promise<{ hostname: string }>;

async function load(params: Params) {
  const { hostname } = await params;
  const ctx = await loadPublicSite("hostname", hostname);
  if (!ctx) return null;
  const page: PublicPage = { kind: "core", key: "home", data: ctx.siteData.pages.home };
  return { ctx, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildSiteMetadata(r.ctx, r.page) : { title: "Site Not Found" };
}

export default async function CustomDomainHome({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicSitePage ctx={r.ctx} page={r.page} />;
}
