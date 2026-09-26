"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Bento photo grid. Hidden for visitors when empty; placeholders while editing. */
export default function T6Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Inside our properties";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 6 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t6-section t6-white">
      <div className="t6-container">
        <div className="t6-head t6-reveal">
          <div>
            <span className="t6-kicker">Gallery</span>
            <EditableText as="h2" className="t6-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>

        <div className="t6-bento t6-reveal">
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t6-bento-empty">
                Photo {idx + 1}
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
