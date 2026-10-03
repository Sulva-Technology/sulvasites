"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { Ornament } from "../icons";

/** Long-form text as a narrow editorial column with a drop cap and ornament bullets. */
export default function T7RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t7-section t7-story">
      <div className="t7-container">
        <article className="t7-story-col t7-reveal">
          <span className="t7-story-orn" aria-hidden="true">
            <Ornament size={14} />
          </span>
          {title || enabled ? (
            <EditableText as="h2" className="t7-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          <div className="t7-prose">
            <EditableHtml
              html={body || (enabled ? "<p>Tell your story: who cooks, what you serve and why guests come back.</p>" : "")}
              onCommit={(nextHtml) => set({ body: nextHtml })}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
