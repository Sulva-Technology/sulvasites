import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicSitePage from "@/components/site/PublicSitePage";
import { isPageKey } from "@/lib/pageSchema";
import { buildSiteMetadata, loadPublicSite, type PublicPage } from "@/lib/publicSite.server";

type Params = Promise<{ slug: string; pageKey: string }>;

async function load(params: Params) {
  const { slug, pageKey } = await params;
  if (!isPageKey(pageKey)) return null;
  const ctx = await loadPublicSite("slug", slug);
  if (!ctx) return null;
  const page: PublicPage = { kind: "core", key: pageKey, data: ctx.siteData.pages[pageKey] };
  return { ctx, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildSiteMetadata(r.ctx, r.page) : { title: "Page Not Found" };
}

export default async function SlugCorePage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicSitePage ctx={r.ctx} page={r.page} />;
}
