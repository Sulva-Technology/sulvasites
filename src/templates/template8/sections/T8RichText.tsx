"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text as a calm reading column on a rounded card; list items get mint check bullets. */
export default function T8RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t8-section t8-prose-section">
      <div className="t8-container">
        <article className="t8-prose-card t8-reveal">
          {title || enabled ? (
            <EditableText as="h2" className="t8-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          <div className="t8-prose">
            <EditableHtml
              html={body || (enabled ? "<p>Tell patients about your practice, how visits work and what to bring.</p>" : "")}
              onCommit={(nextHtml) => set({ body: nextHtml })}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
