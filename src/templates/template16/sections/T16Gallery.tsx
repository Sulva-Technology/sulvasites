"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

type Item = { url: string; alt: string };

function Media({ img }: { img: Item }) {
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(img.url)) {
    return <video src={img.url} autoPlay loop muted playsInline preload="metadata" aria-label={img.alt || "Video"} />;
  }
  // The caption (when there is one) names the photo, so the image itself stays unlabelled.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img.url} alt={img.alt ? "" : "Gallery photo"} loading="lazy" />;
}

/** "Moments": a rounded mosaic — the first photo spans two rows and columns; captions fade up from the bottom. */
export default function T16Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "Moments together");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images: Item[] = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 5 }, () => ({ url: "", alt: "" }))
    : real;

  return (
    <section className="t16-section">
      <div className="t16-container">
        <header className="t16-center-head t16-reveal">
          <p className="t16-kicker">Gallery</p>
          <EditableText as="h2" className="t16-h2" value={title} placeholder="Moments together" onCommit={(next) => set({ title: next })} />
        </header>

        <ul className="t16-mosaic" data-count={Math.min(images.length, 7)}>
          {images.map((img, i) => (
            <li key={i} className="t16-shot t16-reveal">
              <figure>
                {img.url ? (
                  <Media img={img} />
                ) : (
                  <span className="t16-shot-empty">
                    <span>Photo {i + 1}</span>
                  </span>
                )}
                {img.alt ? <figcaption>{img.alt}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
