import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicBlogPage from "@/components/site/PublicBlogPage";
import { buildBlogMetadata, loadBlogPage } from "@/lib/blog/blogPage.server";
import { loadPublicSite } from "@/lib/publicSite.server";

type Params = Promise<{ slug: string; path?: string[] }>;

async function load(params: Params) {
  const { slug, path } = await params;
  return loadBlogPage(await loadPublicSite("slug", slug), path);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await load(params);
  return r ? buildBlogMetadata(r) : { title: "Page Not Found" };
}

export default async function SlugBlogPage({ params }: { params: Params }) {
  const r = await load(params);
  if (!r) notFound();
  return <PublicBlogPage {...r} />;
}
