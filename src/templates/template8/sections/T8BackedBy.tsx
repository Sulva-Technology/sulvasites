"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconShield } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Accreditations / registrations as a trust row of shield badges (or logos). */
export default function T8BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || "Accredited & registered with";
  const logos = enabled
    ? section.logos?.length
      ? section.logos
      : [{ name: "", url: null }]
    : real;

  return (
    <section className="t8-trust">
      <div className="t8-container">
        <div className="t8-trust-inner t8-reveal">
          <EditableText as="p" className="t8-trust-label" value={title} placeholder="Trust row title" onCommit={(next) => set({ title: next })} />
          <ul className="t8-trust-list">
            {logos.map((l, idx) => (
              <li key={idx} className="t8-badge">
                {isImageUrl(l.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.url} alt={l.name || "Accreditation logo"} />
                ) : (
                  <>
                    <span className="t8-badge-ico" aria-hidden="true">
                      <IconShield size={18} />
                    </span>
                    <EditableText
                      as="span"
                      value={l.name}
                      placeholder="Accreditation"
                      onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
