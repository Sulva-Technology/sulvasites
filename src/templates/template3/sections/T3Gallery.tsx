"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "../edit";
import { T3Index } from "../ui";

/** Masonry gallery; empty slots show as dashed placeholders. */
export default function T3Gallery({
  section,
  sectionIndex,
  n,
}: {
  section: GallerySection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "In the studio";
  const real = (section.images ?? []).filter((img) => img.url);
  // Visitors never see empty placeholders; the editor shows slots to fill.
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 6 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t3-section">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Gallery" />
          <EditableText
            as="h2"
            className="t3-title"
            value={title}
            placeholder="Gallery title"
            onCommit={(next) => set({ title: next })}
          />
        </div>

        <div className="t3-masonry">
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t3-shot t3-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t3-shot t3-shot-empty">
                Image {idx + 1}
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
