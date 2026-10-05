import Link from "next/link";
import { notFound } from "next/navigation";

import { TEMPLATE_META } from "@/templates/meta";
import { renderSampleTemplate } from "@/templates/samplePreview";

/**
 * Full template preview with sample content, so admins can browse templates without
 * creating a site. Same paths as /dev/templates. `?embed=1` hides the toolbar (gallery thumbnails).
 */
export default async function AdminTemplatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; page?: string[] }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { key, page } = await params;
  const { embed } = await searchParams;
  const meta = TEMPLATE_META.find((t) => t.key === key);
  const preview = meta ? renderSampleTemplate(key, page, `/admin/templates/${key}`) : null;
  if (!meta || !preview) notFound();

  return (
    <>
      {preview}
      {embed ? null : (
        <nav
          aria-label="Template preview"
          className="fixed bottom-4 left-1/2 z-[2000] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-1 rounded-full bg-koi-ink/90 p-1.5 text-sm text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,.6)] ring-1 ring-white/10 backdrop-blur"
          style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
        >
          <Link
            href="/admin/templates"
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            ← Templates
          </Link>
          <span className="hidden min-w-0 truncate px-2 sm:inline">
            <strong className="font-semibold">{meta.name}</strong>
            <span className="text-white/60"> · {meta.category}</span>
          </span>
          <Link
            href={`/admin/sites/new?template=${meta.key}`}
            className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 font-semibold text-koi-ink hover:bg-white/90"
          >
            Use this template
          </Link>
        </nav>
      )}
    </>
  );
}
