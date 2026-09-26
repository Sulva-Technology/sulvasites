"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Centered long-form article. */
export default function T4RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body =
    section.body || "<p>Tell the story behind the product: the problem you saw, and why you built a better way.</p>";

  return (
    <section className="t4-section">
      <div className="t4-container">
        <article className="t4-article t4-reveal">
          <span className="t4-label">Our story</span>
          {title || enabled ? (
            <EditableText as="h2" className="t4-h2" value={title} placeholder="Section title" style={{ margin: "12px 0 24px" }} onCommit={(next) => set({ title: next })} />
          ) : null}
          <div className="t4-prose">
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
