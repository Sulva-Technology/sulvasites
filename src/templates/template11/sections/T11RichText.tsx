"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { Confetti } from "../icons";

/** Long-form text on an invitation card: confetti corner, gradient rule, violet sparkle bullets. */
export default function T11RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body = section.body || "";
  if (!enabled && !title.trim() && !body.replace(/<[^>]+>/g, "").trim()) return null;

  return (
    <section className="t11-section t11-prose-section">
      <div className="t11-container">
        <article className="t11-card-invite t11-reveal">
          <Confetti set="card" />
          {title || enabled ? (
            <EditableText as="h2" className="t11-h2 t11-card-invite-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          {/* Empty-body hint is CSS-only (data-hint), so it is never saved as content. */}
          <div
            className="t11-prose"
            data-hint={enabled ? "Tell your story, explain how planning works, or list what's included." : undefined}
          >
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
        </article>
      </div>
    </section>
  );
}
