"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Rounded bento grid of the practice. Hidden for visitors when empty; placeholders while editing. */
export default function T8Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Inside the practice";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 5 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t8-section t8-gallery-section">
      <div className="t8-container">
        <header className="t8-head t8-head-center t8-reveal">
          <span className="t8-eyebrow">Gallery</span>
          <EditableText as="h2" className="t8-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t8-bento" data-count={Math.min(images.length, 6)} data-odd={images.length % 2 === 1}>
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t8-shot t8-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t8-shot t8-shot-empty">
                <span>Photo {idx + 1}</span>
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
