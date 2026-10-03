"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { Ornament } from "../icons";

/** Staggered masonry with numbered captions. Hidden for visitors when empty; placeholders while editing. */
export default function T7Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "From our table";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 6 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t7-section t7-gallery-section">
      <div className="t7-container">
        <header className="t7-head t7-head-split t7-reveal">
          <div>
            <span className="t7-eyebrow">
              <Ornament /> Gallery
            </span>
            <EditableText as="h2" className="t7-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
          <span className="t7-count" aria-hidden="true">
            {pad2(images.length)} photos
          </span>
        </header>

        <div className="t7-masonry" data-count={Math.min(images.length, 4)}>
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t7-shot t7-reveal">
                <div className="t7-shot-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || ""} loading="lazy" />
                </div>
                <figcaption>
                  <b>{pad2(idx + 1)}</b>
                  {img.alt ? <span>{img.alt}</span> : null}
                </figcaption>
              </figure>
            ) : (
              <figure key={idx} className="t7-shot t7-shot-empty">
                <div className="t7-shot-frame">Photo {idx + 1}</div>
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
