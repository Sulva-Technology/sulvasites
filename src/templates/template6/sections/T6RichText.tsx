"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text in a white panel: title left, prose right (lists get check marks). */
export default function T6RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body =
    section.body ||
    "<p>Tell your story: how the business started, who you serve and what makes your approach different.</p>";

  return (
    <section className="t6-section">
      <div className="t6-container">
        <div className="t6-panel t6-reveal">
          <div>
            <span className="t6-kicker">About us</span>
            {title || enabled ? (
              <EditableText
                as="h2"
                className="t6-h2"
                value={title}
                placeholder="Section title"
                style={{ marginTop: 14 }}
                onCommit={(next) => set({ title: next })}
              />
            ) : null}
          </div>
          <div className="t6-prose">
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </div>
      </div>
    </section>
  );
}
