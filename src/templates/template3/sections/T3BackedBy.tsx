"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "../edit";
import { T3Index } from "../ui";

const FALLBACK = ["Partner One", "Partner Two", "Partner Three", "Partner Four", "Partner Five"];

// `url` may be a logo image or just a website link — only render real images.
function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** "Trusted by" names in an endless marquee (static, wrapping list while editing). */
export default function T3BackedBy({
  section,
  sectionIndex,
  n,
}: {
  section: BackedBySection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Trusted by";
  const logos = section.logos?.length ? section.logos : FALLBACK.map((name) => ({ name, url: null }));

  const renderItem = (l: { name: string; url: string | null }, idx: number) => (
    <span key={idx} className="t3-marquee-item">
      {isImageUrl(l.url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={l.url} alt={l.name} />
      ) : enabled ? (
        <EditableText
          as="span"
          value={l.name}
          placeholder="Name"
          onCommit={(next) => setItem("logos", logos, idx, { name: next })}
        />
      ) : (
        l.name
      )}
    </span>
  );

  return (
    <section className="t3-marquee-wrap" aria-label={title}>
      <div className="t3-container t3-marquee-label">
        <T3Index n={n} label="Clients" />
        <EditableText
          as="span"
          className="t3-index"
          value={title}
          placeholder="Trusted by"
          onCommit={(next) => set({ title: next })}
        />
      </div>

      {enabled ? (
        <div className="t3-container" style={{ display: "flex", flexWrap: "wrap", gap: "12px 0" }}>
          <div className="t3-marquee-group">{logos.map(renderItem)}</div>
        </div>
      ) : (
        <div className="t3-marquee">
          {/* Two identical groups; the track slides by -50% for a seamless loop. */}
          <div className="t3-marquee-group">{logos.map(renderItem)}</div>
          <div className="t3-marquee-group" aria-hidden="true">
            {logos.map(renderItem)}
          </div>
        </div>
      )}
    </section>
  );
}
