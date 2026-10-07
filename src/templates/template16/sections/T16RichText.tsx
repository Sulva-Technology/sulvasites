"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { T16Title } from "./T16Hero";

/** Long-form text: a pulsing "essence" badge and big two-tone title beside the prose column. */
export default function T16RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t16-section t16-essence">
      <span className="t16-skew" aria-hidden="true" />
      <div className="t16-container t16-essence-grid">
        <div className="t16-essence-head t16-reveal">
          <span className="t16-badge">
            <span className="t16-pulse" aria-hidden="true" /> Our essence
          </span>
          {title || enabled ? (
            <T16Title text={title} className="t16-h2" as="h2" enabled={enabled} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
        </div>
        {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
        <div
          className="t16-prose t16-reveal"
          data-hint={enabled ? "Tell your story: why you started, what you believe and how members grow together." : undefined}
        >
          <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
        </div>
      </div>
    </section>
  );
}
