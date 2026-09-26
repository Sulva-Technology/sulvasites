import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicSitePage from "@/components/site/PublicSitePage";
import { buildSiteMetadata, loadPublicSite, type PublicPage } from "@/lib/publicSite.server";

type Params = Promise<{ slug: string }>;

async function load(params: Params) {
  const { slug } = await params;
  const ctx = await loadPublicSite("slug", slug);
  if (!ctx) return null;
  const page: PublicPage = { kind: "core", key: "home", data: ctx.siteData.pages.home };
  return { ctx, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildSiteMetadata(r.ctx, r.page) : { title: "Site Not Found" };
}

export default async function SlugHomePage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicSitePage ctx={r.ctx} page={r.page} />;
}
