"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconPlus } from "../icons";

/** Questions as ruled <details> rows with a plus that turns into a cross. All open while editing. */
export default function T17FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : (section.items ?? []).filter((it) => it.question?.trim());
  if (items.length === 0) return null;
  return (
    <section className="t17-section">
      <div className="t17-container t17-faq-wrap">
        <header className="t17-reveal">
          <EditableText as="h2" className="t17-h2" value={section.title || (enabled ? "" : "Questions, answered")} placeholder="Section title" onCommit={(next) => set({ title: next })} />
        </header>
        <div className="t17-faq t17-reveal">
          {items.map((it, i) => (
            <details key={i} className="t17-faq-item" open={enabled || undefined}>
              <summary>
                <EditableText as="span" value={it.question ?? ""} placeholder="Question" onCommit={(next) => setItem("items", items, i, { question: next })} />
                <span className="t17-faq-ico" aria-hidden="true">
                  <IconPlus size={18} />
                </span>
              </summary>
              <EditableText as="p" className="t17-body" value={it.answer ?? ""} placeholder="Answer" multiline onCommit={(next) => setItem("items", items, i, { answer: next })} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
