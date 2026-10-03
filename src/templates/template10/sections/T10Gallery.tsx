"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * "Campus life": rounded photos in a bento grid whose layout is picked from the photo count
 * (1–6+), so rows never leave holes; captions sit on small pills. Hidden for visitors when empty.
 */
export default function T10Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "Life on campus");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 4 }, () => ({ url: "", alt: "" }))
    : real;
  const n = images.length;

  return (
    <section className="t10-section t10-gallery-section">
      <div className="t10-container">
        <header className="t10-head t10-head-split t10-reveal">
          <div>
            <span className="t10-kicker">Campus life</span>
            <EditableText as="h2" className="t10-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
        </header>

        <div
          className="t10-bento"
          data-count={n >= 6 ? "many" : n}
          data-rem={n >= 6 ? (n - 5) % 3 : undefined}
          data-odd={(n - 1) % 2 === 1}
        >
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t10-bento-item t10-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t10-bento-item t10-bento-empty">
                <span>Photo {idx + 1}</span>
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
