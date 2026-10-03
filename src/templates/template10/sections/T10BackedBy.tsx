"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconRibbon } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Memberships / accreditations / partners as rounded badges with a ribbon icon (or logos). */
export default function T10BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "Memberships & partners");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t10-partners">
      <div className="t10-container t10-partners-inner t10-reveal">
        <EditableText as="p" className="t10-partners-label" value={title} placeholder="Strip title" onCommit={(next) => set({ title: next })} />
        <ul className="t10-partners-list">
          {logos.map((l, idx) => (
            <li key={idx} className={isImageUrl(l.url) ? "t10-partner t10-partner-logo" : "t10-partner"}>
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Partner logo"} />
              ) : (
                <>
                  <span className="t10-partner-ico" aria-hidden="true">
                    <IconRibbon size={16} />
                  </span>
                  <EditableText
                    as="span"
                    value={l.name}
                    placeholder="Membership / partner"
                    onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
