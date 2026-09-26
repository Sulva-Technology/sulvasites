"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = ["Northwind", "Kora", "Lumen", "Tessera", "Harbor", "Sable"];

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Logo grid with hairline dividers. */
export default function T4BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Trusted by fast-moving teams";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  return (
    <section className="t4-logos">
      <div className="t4-container t4-reveal">
        <EditableText as="p" className="t4-logos-title" value={title} placeholder="Trusted by" onCommit={(next) => set({ title: next })} />
        <div className="t4-logos-grid">
          {logos.map((l, idx) => (
            <div key={idx} className="t4-logo-cell">
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name} />
              ) : (
                <EditableText as="span" value={l.name} placeholder="Name" onCommit={(next) => setItem("logos", logos, idx, { name: next })} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
