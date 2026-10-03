"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * Training-floor photo grid: a large lead shot then tight tiles, with the last tile widened so
 * rows never leave holes. Hidden for visitors when empty; empty slots while editing.
 */
export default function T9Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Inside the club";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 5 }, () => ({ url: "", alt: "" }))
    : real;
  const n = images.length;

  return (
    <section className="t9-section t9-gallery-section">
      <div className="t9-container">
        <header className="t9-head t9-head-split t9-reveal">
          <div>
            <span className="t9-kicker t9-kicker-dark">Gallery</span>
            <EditableText as="h2" className="t9-h2" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
          </div>
        </header>

        <div
          className="t9-shots"
          data-count={Math.min(n, 3)}
          data-rem={n >= 3 ? n % 3 : undefined}
          data-odd={(n - 1) % 2 === 1}
        >
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx} className="t9-shot t9-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            ) : (
              <figure key={idx} className="t9-shot t9-shot-empty">
                <span>Photo {idx + 1}</span>
              </figure>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
