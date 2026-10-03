"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconStar } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Partners / affiliations as a black strip of condensed names (or logos) split by red stars. */
export default function T9BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || "Partners & affiliations";
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t9-partners">
      <div className="t9-container t9-partners-inner t9-reveal">
        <EditableText as="p" className="t9-partners-label" value={title} placeholder="Strip title" onCommit={(next) => set({ title: next })} />
        <ul className="t9-partners-list">
          {logos.map((l, idx) => (
            <li key={idx}>
              {idx > 0 ? (
                <span className="t9-partners-sep" aria-hidden="true">
                  <IconStar size={12} />
                </span>
              ) : null}
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Partner logo"} />
              ) : (
                <EditableText
                  as="span"
                  className="t9-partners-name"
                  value={l.name}
                  placeholder="Partner"
                  onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
