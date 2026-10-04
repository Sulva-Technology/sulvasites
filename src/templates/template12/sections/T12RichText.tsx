"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text on a square spec sheet: thick orange left rule, square orange bullets. */
export default function T12RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t12-section t12-prose-section">
      <div className="t12-container">
        <article className="t12-sheet t12-reveal">
          {title || enabled ? (
            <EditableText as="h2" className="t12-h2 t12-sheet-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div
            className="t12-prose"
            data-hint={enabled ? "Explain how you work, what a quote includes, or list your guarantees." : undefined}
          >
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
