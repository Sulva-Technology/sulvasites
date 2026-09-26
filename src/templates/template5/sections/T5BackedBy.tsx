"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = ["Vogue Bridal", "Glow Weekly", "The Wedding Edit", "Style Diary"];

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** "As seen in" row of italic names / logos. */
export default function T5BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "As seen in";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  return (
    <section className="t5-seen">
      <div className="t5-container t5-seen-inner t5-reveal">
        <EditableText as="span" className="t5-seen-label" value={title} placeholder="As seen in" onCommit={(next) => set({ title: next })} />
        {logos.map((l, idx) => (
          <span key={idx} className="t5-seen-item">
            {isImageUrl(l.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.url} alt={l.name} />
            ) : (
              <EditableText as="span" value={l.name} placeholder="Name" onCommit={(next) => setItem("logos", logos, idx, { name: next })} />
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
