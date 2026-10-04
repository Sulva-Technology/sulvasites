"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text in a narrow centred column with an Italiana title. */
export default function T13RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t13-section t13-prose-section">
      <div className="t13-container">
        <article className="t13-sheet t13-reveal">
          {title || enabled ? (
            <EditableText as="h2" className="t13-h2 t13-sheet-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div className="t13-prose" data-hint={enabled ? "Tell your story, explain sizing, or list what makes your pieces different." : undefined}>
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
