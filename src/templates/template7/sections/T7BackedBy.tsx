"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { Ornament } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** "As featured in" press line: names set in serif, separated by ornaments. */
export default function T7BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || "As featured in";
  const logos = enabled
    ? section.logos?.length
      ? section.logos
      : [{ name: "", url: null }]
    : real;

  return (
    <section className="t7-press">
      <div className="t7-container t7-press-inner t7-reveal">
        <EditableText as="p" className="t7-press-label" value={title} placeholder="Press title" onCommit={(next) => set({ title: next })} />
        <div className="t7-press-list">
          {logos.map((l, idx) => (
            <span key={idx} className="t7-press-item">
              {idx > 0 ? (
                <span className="t7-press-sep" aria-hidden="true">
                  <Ornament size={8} />
                </span>
              ) : null}
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name} />
              ) : (
                <EditableText
                  as="span"
                  value={l.name}
                  placeholder="Publication"
                  onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
