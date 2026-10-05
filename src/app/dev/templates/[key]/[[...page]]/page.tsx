import { notFound } from "next/navigation";

import { renderSampleTemplate } from "@/templates/samplePreview";

/**
 * Dev-only template preview with sample content (no database needed):
 *   /dev/templates/t3            → home
 *   /dev/templates/t3/about      → about
 *   /dev/templates/t3/p/work     → extra page (template preset, filled with sample sections)
 *   /dev/templates/t13/shop/...  → storefront views (shop templates only; sampleShop data)
 * Disabled in production — admins use /admin/templates.
 */
export default async function DevTemplatePreview({
  params,
}: {
  params: Promise<{ key: string; page?: string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { key, page } = await params;
  return renderSampleTemplate(key, page, `/dev/templates/${key}`) ?? notFound();
}
