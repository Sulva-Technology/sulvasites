"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Regular 3-column photo grid. Hidden for visitors when empty. */
export default function T1Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Inside our work";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 3 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t1-section">
      <div className="t1-container">
        <div className="t1-head t1-head-single t1-reveal">
          <div>
            <span className="t1-over">Gallery</span>
            <EditableText as="h2" className="t1-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>
        <div className="t1-gallery t1-reveal">
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t1-gallery-empty">
                Photo {idx + 1}
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
