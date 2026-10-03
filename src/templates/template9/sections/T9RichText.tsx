"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Long-form text: condensed title in a left rail with a red rule, reading column on the right; red square bullets. */
export default function T9RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t9-section t9-prose-section">
      <div className="t9-container">
        <article className="t9-prose-grid t9-reveal" data-title={!!title || enabled}>
          {title || enabled ? (
            <div className="t9-prose-rail">
              <EditableText as="h2" className="t9-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
            </div>
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div
            className="t9-prose"
            data-hint={enabled ? "Tell people how you train, what a first session looks like and what to bring." : undefined}
          >
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
