"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT5 } from "../ctx";
import { IconInstagram } from "../icons";

/** Portfolio grid of arched / rounded tiles. Hidden for visitors when empty. */
export default function T5Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { profile } = useT5();
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Recent looks";
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 4 }, () => ({ url: "", alt: "" }))
    : real;
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const instagram = typeof socials.instagram === "string" ? socials.instagram : "";

  return (
    <section className="t5-section t5-blush">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">Portfolio</span>
          <EditableText as="h2" className="t5-title" value={title} placeholder="Gallery title" onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t5-gallery t5-reveal">
          {images.map((img, idx) =>
            img.url ? (
              <figure key={idx}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ""} loading="lazy" />
              </figure>
            ) : (
              <figure key={idx} className="t5-gallery-empty">
                Photo {idx + 1}
              </figure>
            ),
          )}
        </div>
        {instagram ? (
          <div className="t5-center" style={{ marginTop: 48 }}>
            <a className="t5-btn t5-btn-ghost" href={instagram} target="_blank" rel="noreferrer">
              <IconInstagram /> See more on Instagram
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
