import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicShopPage from "@/components/site/PublicShopPage";
import { loadPublicSite } from "@/lib/publicSite.server";
import { buildShopMetadata, loadShopPage } from "@/lib/shop/shopPage.server";

type Params = Promise<{ slug: string; path?: string[] }>;

async function load(params: Params) {
  const { slug, path } = await params;
  return loadShopPage(await loadPublicSite("slug", slug), path);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildShopMetadata(r) : { title: "Page Not Found" };
}

export default async function SlugShopPage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicShopPage {...r} />;
}
