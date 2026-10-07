"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { BackedBySection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** "As featured in": names set in serif italic between dots (or logos). */
export default function T17BackedBy({ section, sectionIndex }: { section: BackedBySection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const logos = (section.logos ?? []).filter((l) => l.name?.trim() || l.url);
  if (!enabled && logos.length === 0) return null;
  return (
    <section className="t17-section t17-section-tight">
      <div className="t17-container t17-featured t17-reveal">
        <EditableText as="p" className="t17-kicker" value={section.title || (enabled ? "" : "As featured in")} placeholder="As featured in" onCommit={(next) => set({ title: next })} />
        <ul>
          {logos.map((l, i) => (
            <li key={i}>
              {l.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt={l.name} />
              ) : (
                l.name
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
