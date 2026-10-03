"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconStar } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Partners / memberships / vendor network as tilted sticker chips (or logos) on a soft band. */
export default function T11BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "Partners & memberships");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t11-partners">
      <div className="t11-container t11-partners-inner t11-reveal">
        <EditableText as="p" className="t11-partners-label" value={title} placeholder="Partners & memberships" onCommit={(next) => set({ title: next })} />
        <ul className="t11-partners-list">
          {logos.map((l, idx) => (
            <li key={idx} className={isImageUrl(l.url) ? "t11-partner t11-partner-logo" : "t11-partner"}>
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Partner logo"} />
              ) : (
                <>
                  <span className="t11-partner-ico" aria-hidden="true">
                    <IconStar size={14} />
                  </span>
                  <EditableText
                    as="span"
                    value={l.name}
                    placeholder="Partner / membership"
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
