"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Captioned plates in a three-column masonry, like a photo essay. */
export default function T17Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const images = (section.images ?? []).filter((im) => im.url?.trim());
  if (!enabled && images.length === 0) return null;
  return (
    <section className="t17-section">
      <div className="t17-container">
        <div className="t17-rule-head t17-reveal">
          <EditableText as="h2" className="t17-kicker" value={section.title || (enabled ? "" : "In pictures")} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t17-plates">
          {images.map((im, i) => (
            <figure key={i} className="t17-plate t17-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.alt} loading="lazy" />
              {im.alt ? (
                <figcaption>
                  <span>Fig. {i + 1}</span> {im.alt}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
