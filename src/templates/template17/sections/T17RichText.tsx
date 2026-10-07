"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** A margin label beside long-form prose with a drop cap: the "letter from the editor". */
export default function T17RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const body = section.body || (enabled ? "" : "<p>Tell readers who you are, what you write about and why it matters to you.</p>");
  return (
    <section className="t17-section">
      <div className="t17-container t17-essay">
        <aside className="t17-essay-side t17-reveal">
          <p className="t17-kicker">From the desk</p>
          {section.title || enabled ? (
            <EditableText as="h2" className="t17-h3" value={section.title || ""} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
        </aside>
        <div className="t17-prose t17-dropcap t17-reveal">
          <EditableHtml html={body} onCommit={(next) => set({ body: next })} />
        </div>
      </div>
    </section>
  );
}
