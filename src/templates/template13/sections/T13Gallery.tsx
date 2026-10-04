"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * "The lookbook": a staggered editorial grid of portrait photos (3 columns on desktop, 2 on
 * phones, middle column dropped lower for rhythm). Hidden for visitors when empty.
 */
export default function T13Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "Lookbook");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 3 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t13-section t13-gallery-section">
      <div className="t13-container">
        <header className="t13-head t13-reveal">
          <p className="t13-label">Lookbook</p>
          <EditableText as="h2" className="t13-h2" value={title} placeholder="Lookbook" onCommit={(next) => set({ title: next })} />
        </header>

        <ul className="t13-gallery" data-count={images.length}>
          {images.map((img, idx) =>
            img.url ? (
              <li key={idx} className="t13-shot t13-reveal">
                <figure>
                  {/* The description is shown (and read) once, as the figcaption below. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ? "" : "Lookbook photo"} loading="lazy" />
                  {img.alt ? <figcaption>{img.alt}</figcaption> : null}
                </figure>
              </li>
            ) : (
              <li key={idx} className="t13-shot t13-shot-empty">
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
