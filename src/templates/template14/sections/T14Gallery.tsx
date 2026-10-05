"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * "Gallery": a tidy grid of portrait photos (3 columns on desktop, 2 on
 * phones, middle column dropped lower for rhythm). Hidden for visitors when empty.
 */
export default function T14Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "Gallery");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 3 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t14-section t14-gallery-section">
      <div className="t14-container">
        <header className="t14-head t14-reveal">
          <p className="t14-label">Gallery</p>
          <EditableText as="h2" className="t14-h2" value={title} placeholder="Gallery" onCommit={(next) => set({ title: next })} />
        </header>

        <ul className="t14-gallery" data-count={images.length}>
          {images.map((img, idx) =>
            img.url ? (
              <li key={idx} className="t14-shot t14-reveal">
                <figure>
                  {/* The description is shown (and read) once, as the figcaption below. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ? "" : "Gallery photo"} loading="lazy" />
                  {img.alt ? <figcaption>{img.alt}</figcaption> : null}
                </figure>
              </li>
            ) : (
              <li key={idx} className="t14-shot t14-shot-empty">
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
