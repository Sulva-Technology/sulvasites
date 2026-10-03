"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text on a rounded "notebook" card: blue margin rule, sunflower dot bullets. */
export default function T10RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t10-section t10-prose-section">
      <div className="t10-container">
        <article className="t10-notebook t10-reveal">
          {title || enabled ? (
            <EditableText as="h2" className="t10-h2 t10-notebook-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div
            className="t10-prose"
            data-hint={enabled ? "Explain how admissions work, what a typical day looks like, or what learners need to bring." : undefined}
          >
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
