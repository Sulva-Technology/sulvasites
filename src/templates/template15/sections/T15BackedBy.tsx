"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Marques, partners and memberships as a quiet row of names (or logos) inside one wide glass panel. */
export default function T15BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "Marques & partners");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t15-section t15-partners-section">
      <div className="t15-container">
        <div className="t15-partners t15-glass t15-reveal">
          <EditableText
            as="h2"
            className="t15-eyebrow t15-partners-title"
            value={title}
            placeholder="Marques & partners"
            onCommit={(next) => set({ title: next })}
          />
          <ul className="t15-marques">
            {logos.map((l, idx) => (
              <li key={idx} data-logo={isImageUrl(l.url)}>
                {isImageUrl(l.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.url} alt={l.name || "Partner logo"} />
                ) : (
                  <EditableText
                    as="span"
                    value={l.name ?? ""}
                    placeholder="Marque / partner"
                    onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
