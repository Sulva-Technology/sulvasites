"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Horizontal scroll of product screenshots. Hidden for visitors when empty. */
export default function T4Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "A closer look";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 3 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t4-section">
      <div className="t4-container">
        <div className="t4-head t4-reveal">
          <span className="t4-label">Screens</span>
          <EditableText as="h2" className="t4-h2" value={title} placeholder="Gallery title" style={{ marginTop: 12 }} onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t4-screens t4-reveal">
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t4-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t4-shot t4-shot-empty">
                Screenshot {idx + 1}
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
