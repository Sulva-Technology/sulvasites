import { createElement } from "react";
import { notFound } from "next/navigation";

import { isPageKey } from "@/lib/pageSchema";
import { getTemplate } from "@/templates/registry";
import { sampleExtraPage, sampleSite } from "@/templates/sampleSite";

/**
 * Dev-only template preview with sample content (no database needed):
 *   /dev/templates/t3            → home
 *   /dev/templates/t3/about      → about
 *   /dev/templates/t3/p/work     → extra page (template preset, filled with sample sections)
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

  const props = sampleSite(key);
  const baseUrl = `/dev/templates/${key}`;

  if (page?.[0] === "p" && page[1]) {
    const extra = sampleExtraPage(key, props, page[1]);
    if (!extra) notFound();
    return createElement(Template, { ...props, currentPage: null, pageOverride: extra, currentExtraKey: page[1], baseUrl });
  }

  const pageKey = page?.[0] ?? "home";
  if (!isPageKey(pageKey)) notFound();

  return createElement(Template, { ...props, currentPage: pageKey, baseUrl });
}
