import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicSitePage from "@/components/site/PublicSitePage";
import {
  buildSiteMetadata,
  loadPublicSite,
  loadPublishedExtraPage,
  type PublicPage,
} from "@/lib/publicSite.server";

type Params = Promise<{ slug: string; key: string }>;

async function load(params: Params) {
  const { slug, key } = await params;
  const ctx = await loadPublicSite("slug", slug);
  if (!ctx) return null;
  const data = await loadPublishedExtraPage(ctx.siteData.site.id, key);
  if (!data) return null;
  const page: PublicPage = { kind: "extra", key, data };
  return { ctx, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildSiteMetadata(r.ctx, r.page) : { title: "Page Not Found" };
}

export default async function SlugExtraPage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicSitePage ctx={r.ctx} page={r.page} />;
}
