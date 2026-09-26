"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

/** Contact-sheet grid with "Fig." captions. Hidden for visitors when empty. */
export default function T2Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Contact sheet";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 5 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t2-section t2-paper">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Portfolio</span>
            <EditableText as="h2" className="t2-title" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
          <span className="t2-meta">{images.length} images</span>
        </div>
        <div className="t2-sheet t2-reveal">
          {images.map((img, idx) => (
            <figure key={idx} className={img.url ? undefined : "t2-sheet-empty"}>
              <div className="t2-sheet-img">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt || ""} loading="lazy" />
                ) : (
                  <span>Image {idx + 1}</span>
                )}
              </div>
              <figcaption>
                <b>Fig. {pad2(idx + 1)}</b>
                {img.alt || "Untitled"}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
