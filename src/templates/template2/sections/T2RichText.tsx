"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text as a two-column article with a red drop cap. */
export default function T2RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body =
    section.body ||
    "<p>Tell your story: where you started, what you care about and the kind of work you want to make next.</p>";

  return (
    <section className="t2-section t2-section-rule">
      <div className="t2-container">
        <div className="t2-article-head t2-reveal">
          <span className="t2-kicker">Essay</span>
          {title || enabled ? (
            <EditableText as="h2" className="t2-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
        </div>
        <div className="t2-article t2-reveal">
          <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
        </div>
      </div>
    </section>
  );
}
