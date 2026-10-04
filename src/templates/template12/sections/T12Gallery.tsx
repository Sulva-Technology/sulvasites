"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * "On site": a square-cornered photo grid. The first photo becomes a large feature tile only
 * when the remaining tiles fill whole rows (3 columns on desktop, 2 on phones), so the grid
 * never has holes. Hidden for visitors when empty.
 */
export default function T12Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "On site");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 3 }, () => ({ url: "", alt: "" }))
    : real;
  const n = images.length;

  return (
    <section className="t12-section t12-gallery-section">
      <div className="t12-container">
        <header className="t12-head t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" /> Gallery
          </p>
          <EditableText as="h2" className="t12-h2" value={title} placeholder="On site" onCommit={(next) => set({ title: next })} />
        </header>

        <ul
          className="t12-gallery"
          data-count={n}
          data-feature={n >= 6 && n % 3 === 0}
          data-mfeature={n >= 3 && n % 2 === 1}
        >
          {images.map((img, idx) =>
            img.url ? (
              <li key={idx} className="t12-shot t12-reveal">
                <figure>
                  {/* The description is shown (and read) once, as the figcaption below. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ? "" : "Project photo"} loading="lazy" />
                  {img.alt ? <figcaption>{img.alt}</figcaption> : null}
                </figure>
              </li>
            ) : (
              <li key={idx} className="t12-shot t12-shot-empty">
                <figure>
                  <span>Photo {idx + 1}</span>
                </figure>
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
