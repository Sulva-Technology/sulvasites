"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = ["The Guardian", "Design Week", "It's Nice That", "Monocle", "Wallpaper*"];

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Black ticker tape of press / client names (static while editing). */
export default function T2BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Featured in";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  const item = (l: { name: string; url: string | null }, idx: number) => (
    <span key={idx} className="t2-ticker-item">
      {isImageUrl(l.url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={l.url} alt={l.name} />
      ) : enabled ? (
        <EditableText as="span" value={l.name} placeholder="Name" onCommit={(next) => setItem("logos", logos, idx, { name: next })} />
      ) : (
        l.name
      )}
    </span>
  );

  return (
    <section className="t2-ticker" aria-label={title}>
      <div className="t2-ticker-row">
        <EditableText as="span" className="t2-ticker-label" value={title} placeholder="Featured in" onCommit={(next) => set({ title: next })} />
        {enabled ? (
          <div className="t2-ticker-group" style={{ flexWrap: "wrap" }}>
            {logos.map(item)}
          </div>
        ) : (
          <div className="t2-ticker-track">
            <div className="t2-ticker-group">{logos.map(item)}</div>
            <div className="t2-ticker-group" aria-hidden="true">
              {logos.map(item)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
