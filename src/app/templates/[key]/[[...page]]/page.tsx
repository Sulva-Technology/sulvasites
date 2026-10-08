import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DemoBar from "@/components/marketing/DemoBar";
import { TEMPLATE_META } from "@/templates/meta";
import { renderSampleTemplate } from "@/templates/samplePreview";

type Params = Promise<{ key: string; page?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  const meta = TEMPLATE_META.find((t) => t.key === key);
  return meta ? { title: `${meta.name} — ${meta.category} website template | Sulva Sites`, description: meta.description } : {};
}

/** Public demo of a template with sample content. `?thumb=1` (gallery thumbnails) hides the demo bar. */
export default async function TemplateDemoPage({ params, searchParams }: { params: Params; searchParams: Promise<{ thumb?: string }> }) {
  const { key, page } = await params;
  const { thumb } = await searchParams;
  const meta = TEMPLATE_META.find((t) => t.key === key);
  if (!meta) notFound();
  const view = renderSampleTemplate(key, page, `/templates/${key}`);
  if (!view) notFound();
  return (
    <>
      {view}
      {thumb ? null : <DemoBar templateKey={key} name={meta.name} />}
    </>
  );
}
