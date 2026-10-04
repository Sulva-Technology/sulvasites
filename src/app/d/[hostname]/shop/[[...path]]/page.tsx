import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicShopPage from "@/components/site/PublicShopPage";
import { loadPublicSite } from "@/lib/publicSite.server";
import { buildShopMetadata, loadShopPage } from "@/lib/shop/shopPage.server";

type Params = Promise<{ hostname: string; path?: string[] }>;

async function load(params: Params) {
  const { hostname, path } = await params;
  return loadShopPage(await loadPublicSite("hostname", hostname), path);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildShopMetadata(r) : { title: "Page Not Found" };
}

export default async function CustomDomainShopPage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicShopPage {...r} />;
}
