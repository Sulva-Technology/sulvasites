"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * Journal feature card (first photo + title) over a masonry of the rest. No lightbox exists here,
 * so each photo links to its full-size image. Hidden for visitors when empty.
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
  const feature = images[0]?.url ? images[0] : null;
  const rest = feature ? images.slice(1) : images;

  const titleEl = (
    <EditableText as="h2" className="t13-gal-title" value={title} placeholder="Lookbook" onCommit={(next) => set({ title: next })} />
  );

  return (
    <section className="t13-section t13-gallery-section">
      <div className="t13-container">
        {feature ? (
          <div className="t13-gal-feature t13-reveal">
            <div className="t13-gal-copy">
              <p className="t13-label">Lookbook</p>
              {titleEl}
              <p className="t13-gal-count t13-mono">
                {real.length} {real.length === 1 ? "photograph" : "photographs"}
              </p>
              {feature.alt ? <p className="t13-gal-alt">{feature.alt}</p> : null}
            </div>
            <a className="t13-gal-hero" href={feature.url} target="_blank" rel="noreferrer">
              {/* The description is shown (and read) as the paragraph beside it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feature.url} alt={feature.alt ? "" : "Lookbook photo"} loading="lazy" />
            </a>
          </div>
        ) : (
          <header className="t13-sec-head t13-reveal">
            <div>
              <p className="t13-label">Lookbook</p>
              {titleEl}
            </div>
          </header>
        )}

        {rest.length > 0 ? (
          <ul className="t13-gallery" data-count={rest.length}>
            {rest.map((img, idx) =>
              img.url ? (
                <li key={idx} className="t13-shot t13-reveal">
                  <figure>
                    <a href={img.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt ? "" : "Lookbook photo"} loading="lazy" />
                    </a>
                    {img.alt ? <figcaption className="t13-mono">{img.alt}</figcaption> : null}
                  </figure>
                </li>
              ) : (
                <li key={idx} className="t13-shot t13-shot-empty">
                  <figure>
                    <span>Photo {idx + 1 + (feature ? 1 : 0)}</span>
                  </figure>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
