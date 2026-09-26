"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** "Who we are": sticky heading on the left, prose on the right. */
export default function T1RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "<p>Describe who you are, who you serve and the principles behind your work.</p>";

  return (
    <section className="t1-section">
      <div className="t1-container t1-about">
        <div className="t1-about-side t1-reveal">
          <span className="t1-over">Who we are</span>
          {title || enabled ? (
            <EditableText as="h2" className="t1-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
        </div>
        <div className="t1-prose t1-reveal">
          <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
        </div>
      </div>
    </section>
  );
}
