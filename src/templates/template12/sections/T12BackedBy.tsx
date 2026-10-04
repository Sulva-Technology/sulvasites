"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconBadge } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/** Licences, certifications and memberships as square badge plates (or logos) on a concrete band. */
export default function T12BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const real = (section.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (!enabled && real.length === 0) return null;
  const title = section.title || (enabled ? "" : "Credentials");
  const logos = enabled ? (section.logos?.length ? section.logos : [{ name: "", url: null }]) : real;

  return (
    <section className="t12-creds-band">
      <div className="t12-container t12-creds-inner t12-reveal">
        <EditableText
          as="h2"
          className="t12-label t12-creds-title"
          value={title}
          placeholder="Licences & certifications"
          onCommit={(next) => set({ title: next })}
        />
        <ul className="t12-badges">
          {logos.map((l, idx) => (
            <li key={idx} className={isImageUrl(l.url) ? "t12-badge t12-badge-logo" : "t12-badge"}>
              {isImageUrl(l.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name || "Certification logo"} />
              ) : (
                <>
                  <span className="t12-badge-ico" aria-hidden="true">
                    <IconBadge size={18} />
                  </span>
                  <EditableText
                    as="span"
                    value={l.name ?? ""}
                    placeholder="Licence / certification"
                    onCommit={(next) => setItem("logos", logos, idx, { name: next })}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
