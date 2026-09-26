"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = ["Partner One", "Partner Two", "Partner Three", "Partner Four", "Partner Five"];

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Developer / partner strip on white. */
export default function T6BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Trusted by leading developers and partners";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  return (
    <section className="t6-partners t6-white">
      <div className="t6-container t6-partners-inner t6-reveal">
        <EditableText
          as="p"
          className="t6-partners-label"
          value={title}
          placeholder="Partners title"
          multiline
          onCommit={(next) => set({ title: next })}
        />
        <div className="t6-partners-list">
          {logos.map((l, idx) => (
            <span key={idx} className="t6-partner">
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name} />
              ) : (
                <EditableText
                  as="span"
                  value={l.name}
                  placeholder="Partner"
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
