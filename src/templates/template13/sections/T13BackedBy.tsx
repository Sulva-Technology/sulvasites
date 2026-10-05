"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Press and stockist names under a centred mono label (logos are shown greyscale, full colour on hover). */
export default function T13BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "As seen in");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t13-press-band">
      <div className="t13-container t13-press-inner t13-reveal">
        <EditableText as="h2" className="t13-press-title" value={title} placeholder="As seen in" onCommit={(next) => set({ title: next })} />
        <ul className="t13-press">
          {logos.map((l, idx) => (
            <li key={idx}>
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Logo"} />
              ) : (
                <EditableText
                  as="span"
                  value={l.name ?? ""}
                  placeholder="Name"
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
