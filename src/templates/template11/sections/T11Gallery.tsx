"use client";

import { useRef } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconArrow, IconArrowLeft } from "../icons";

/**
 * "Past events": a horizontal scroll-snap strip of tilted photo cards with caption pills.
 * The strip is a focusable, labelled region (arrow keys scroll it) with prev/next buttons.
 * Hidden for visitors when empty.
 */
export default function T11Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const stripRef = useRef<HTMLDivElement>(null);
  const title = section.title || (enabled ? "" : "Past events");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;
  const images = enabled
    ? section.images?.length
      ? section.images
      : Array.from({ length: 4 }, () => ({ url: "", alt: "" }))
    : real;
  const id = `t11-strip-${sectionIndex ?? 0}`;

  const scroll = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="t11-section t11-gallery-section">
      <div className="t11-container">
        <header className="t11-head t11-head-split t11-reveal">
          <div>
            <span className="t11-kicker">Gallery</span>
            <EditableText as="h2" className="t11-h2" value={title} placeholder="Past events" onCommit={(next) => set({ title: next })} />
          </div>
          {images.length > 1 ? (
            <div className="t11-strip-nav">
              <button type="button" className="t11-icon-btn" aria-controls={id} aria-label="Scroll photos left" onClick={() => scroll(-1)}>
                <IconArrowLeft />
              </button>
              <button type="button" className="t11-icon-btn" aria-controls={id} aria-label="Scroll photos right" onClick={() => scroll(1)}>
                <IconArrow />
              </button>
            </div>
          ) : null}
        </header>
      </div>

      <div
        ref={stripRef}
        id={id}
        className="t11-strip t11-reveal"
        role="region"
        aria-label={`${title || "Gallery"} — photo strip, scroll sideways`}
        tabIndex={0}
      >
        <ul className="t11-strip-list" data-count={images.length}>
          {images.map((img, idx) =>
            img.url ? (
              <li key={idx} className="t11-shot">
                <figure>
                  {/* The description is shown (and read) once, as the figcaption below. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" />
                  {img.alt ? <figcaption>{img.alt}</figcaption> : null}
                </figure>
              </li>
            ) : (
              <li key={idx} className="t11-shot t11-shot-empty">
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
