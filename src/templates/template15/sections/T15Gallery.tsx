"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { isVideoUrl } from "../ctx";

type Item = { url: string; alt: string };

function Media({ img, eager }: { img: Item; eager?: boolean }) {
  if (isVideoUrl(img.url)) {
    return <video src={img.url} autoPlay loop muted playsInline preload="metadata" aria-label={img.alt || "Video"} />;
  }
  // The caption (when there is one) names the photo, so the image itself stays unlabelled.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img.url} alt={img.alt ? "" : "Gallery photo"} loading={eager ? "eager" : "lazy"} />;
}

/**
 * Editorial gallery ("Behind the machines"): with four or more photos the first is a large
 * feature with a glass caption and the next three stack beside it as captioned thumbnails;
 * the rest follow as a rounded grid. Fewer photos fall back to the grid. Videos play muted.
 */
export default function T15Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || (enabled ? "" : "Behind the machines");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images: Item[] = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 4 }, () => ({ url: "", alt: "" }))
    : real;

  const editorial = images.length >= 4;
  const [feature, ...rest] = images;
  const side = editorial ? rest.slice(0, 3) : [];
  const grid = editorial ? rest.slice(3) : images;

  const empty = (idx: number) => (
    <span className="t15-shot-empty">
      <span>Photo {idx + 1}</span>
    </span>
  );

  return (
    <section className="t15-section t15-gallery-section">
      <div className="t15-container">
        <header className="t15-head t15-reveal">
          <EditableText as="h2" className="t15-h2" value={title} placeholder="Behind the machines" onCommit={(next) => set({ title: next })} />
        </header>

        {editorial && feature ? (
          <div className="t15-stories">
            <figure className="t15-story-feature t15-reveal">
              <span className="t15-story-photo">{feature.url ? <Media img={feature} /> : empty(0)}</span>
              {feature.alt ? <figcaption className="t15-story-title">{feature.alt}</figcaption> : null}
            </figure>
            <ul className="t15-story-list">
              {side.map((img, i) => (
                <li key={i} className="t15-story t15-reveal">
                  <span className="t15-story-thumb">{img.url ? <Media img={img} /> : empty(i + 1)}</span>
                  {img.alt ? <span className="t15-story-caption">{img.alt}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {grid.length ? (
          <ul className="t15-gallery" data-count={grid.length}>
            {grid.map((img, i) => (
              <li key={i} className="t15-shot t15-reveal">
                <figure>
                  {img.url ? <Media img={img} /> : empty(i + (editorial ? 4 : 0))}
                  {img.alt ? <figcaption>{img.alt}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
