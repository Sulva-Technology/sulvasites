"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Partners, affiliations and chapters as a quiet centred row of names (or logos) between hairlines. */
export default function T16BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "Partners & affiliations");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t16-partners">
      <div className="t16-container t16-reveal">
        <EditableText
          as="h2"
          className="t16-kicker t16-partners-title"
          value={title}
          placeholder="Partners & affiliations"
          onCommit={(next) => set({ title: next })}
        />
        <ul className="t16-partner-row">
          {logos.map((l, idx) => (
            <li key={idx} data-logo={isImageUrl(l.url)}>
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Partner logo"} />
              ) : (
                <EditableText
                  as="span"
                  value={l.name ?? ""}
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
