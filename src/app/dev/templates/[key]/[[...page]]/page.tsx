import { createElement } from "react";
import { notFound } from "next/navigation";

import { isPageKey } from "@/lib/pageSchema";
import { getTemplate } from "@/templates/registry";
import { sampleSite } from "@/templates/sampleSite";

/**
 * Dev-only template preview with sample content (no database needed):
 *   /dev/templates/t3            → home
 *   /dev/templates/t3/about      → about
 * Disabled in production.
 */
export default async function DevTemplatePreview({
  params,
}: {
  params: Promise<{ key: string; page?: string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { key, page } = await params;
  const Template = getTemplate(key);
  if (!Template) notFound();

  const pageKey = page?.[0] ?? "home";
  if (!isPageKey(pageKey)) notFound();

  return createElement(Template, {
    ...sampleSite(key),
    currentPage: pageKey,
    baseUrl: `/dev/templates/${key}`,
  });
}
