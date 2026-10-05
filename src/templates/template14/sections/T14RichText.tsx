"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text in a narrow centred column with a display title. */
export default function T14RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t14-section t14-prose-section">
      <div className="t14-container">
        <article className="t14-sheet t14-reveal">
          {title || enabled ? (
            <EditableText as="h2" className="t14-h2 t14-sheet-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div className="t14-prose" data-hint={enabled ? "Share your story, delivery details or returns information." : undefined}>
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
