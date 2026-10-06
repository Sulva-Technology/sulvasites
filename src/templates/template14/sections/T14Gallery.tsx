"use client";

import { useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { GallerySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import T14Lightbox from "../components/T14Lightbox";

/**
 * "Gallery" as a journal: one big photo on the left, the next four as a list on the right and any
 * further photos in a strip below. Photos open in a lightbox. Hidden for visitors when empty.
 */
export default function T14Gallery({ section, sectionIndex }: { section: GallerySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const [box, setBox] = useState<{ at: number; root: HTMLElement } | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const title = section.title || (enabled ? "" : "Gallery");
  const real = (section.images ?? []).filter((img) => img.url);
  if (!enabled && real.length === 0) return null;

  const open = (i: number, el: HTMLElement) => {
    const root = el.closest<HTMLElement>(".template14");
    if (!root) return;
    openerRef.current = el;
    setBox({ at: i, root });
  };
  const close = () => {
    setBox(null);
    // Safari does not focus a clicked button, so hand focus back explicitly once the viewer is gone.
    requestAnimationFrame(() => openerRef.current?.focus());
  };
  const label = (i: number) => real[i]?.alt?.trim() || `Photo ${i + 1}`;
  const chipTitle = section.title?.trim() || "Gallery";

  return (
    <section className="t14-section t14-jr">
      <div className="t14-container">
        <header className="t14-jr-head t14-reveal">
          <EditableText as="h2" className="t14-h2" value={title} placeholder="Gallery" onCommit={(next) => set({ title: next })} />
          {real.length > 0 ? (
            <button type="button" className="t14-pill t14-pill-soft" onClick={(e) => open(0, e.currentTarget)}>
              View all
            </button>
          ) : null}
        </header>

        {real.length === 0 ? (
          <ul className="t14-jr-empty">
            {[1, 2, 3].map((n) => (
              <li key={n}>Photo {n}</li>
            ))}
          </ul>
        ) : (
          <>
            <div className="t14-jr-grid" data-solo={real.length === 1}>
              <button
                type="button"
                className="t14-jr-big t14-reveal"
                onClick={(e) => open(0, e.currentTarget)}
                aria-label={`Open photo 1: ${label(0)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={real[0].url} alt="" loading="lazy" />
                <span className="t14-chip t14-jr-cap">{label(0)}</span>
                <span className="t14-chip t14-jr-count">{real.length} photos</span>
              </button>

              {real.length > 1 ? (
                <ul className="t14-jr-list t14-reveal">
                  {real.slice(1, 5).map((img, k) => {
                    const i = k + 1;
                    return (
                      <li key={i}>
                        <button type="button" className="t14-jr-row" onClick={(e) => open(i, e.currentTarget)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" loading="lazy" />
                          <span className="t14-jr-meta">
                            <span className="t14-chip t14-jr-tag">{chipTitle}</span>
                            <span className="t14-jr-alt">{label(i)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            {real.length > 5 ? (
              <ul className="t14-jr-strip t14-reveal">
                {real.slice(5).map((img, k) => (
                  <li key={k}>
                    <button type="button" onClick={(e) => open(k + 5, e.currentTarget)} aria-label={`Open photo ${k + 6}: ${label(k + 5)}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
      {box ? <T14Lightbox images={real} startAt={box.at} portalTo={box.root} onClose={close} /> : null}
    </section>
  );
}
