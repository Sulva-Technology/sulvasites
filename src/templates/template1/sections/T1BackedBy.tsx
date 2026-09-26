"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = ["Northwind", "Harbor Bank", "Tessera", "Meridian Health", "Kestrel"];

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Client logo row under the hero. */
export default function T1BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Trusted by";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  return (
    <section className="t1-clients">
      <div className="t1-container t1-clients-inner t1-reveal">
        <EditableText as="span" className="t1-clients-label" value={title} placeholder="Trusted by" onCommit={(next) => set({ title: next })} />
        <div className="t1-clients-list">
          {logos.map((l, idx) => (
            <span key={idx} className="t1-client">
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name} />
              ) : (
                <EditableText as="span" value={l.name} placeholder="Client" onCommit={(next) => setItem("logos", logos, idx, { name: next })} />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
