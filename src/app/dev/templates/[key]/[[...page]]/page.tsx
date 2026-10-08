import { notFound } from "next/navigation";

import { parseCheckoutMode } from "@/lib/shop/checkoutMode";
import { renderSampleTemplate } from "@/templates/samplePreview";

/**
 * Dev-only template preview with sample content (no database needed):
 *   /dev/templates/t3            → home
 *   /dev/templates/t3/about      → about
 *   /dev/templates/t3/p/work     → extra page (template preset, filled with sample sections)
 *   /dev/templates/t13/shop/...  → storefront views (shop templates only; sampleShop data)
 *   ?checkout=card|whatsapp      → preview the shop with that checkout mode
 * Disabled in production — admins use /admin/templates.
 */
export default async function DevTemplatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; page?: string[] }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { key, page } = await params;
  const { checkout } = await searchParams;
  const checkoutMode = checkout ? parseCheckoutMode(checkout) : undefined;
  return renderSampleTemplate(key, page, `/dev/templates/${key}`, { checkoutMode }) ?? notFound();
}
