"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/** Reader notes as large serif pull quotes in two columns. */
export default function T17Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : (section.items ?? []).filter((it) => it.quote?.trim());
  if (items.length === 0) return null;
  return (
    <section className="t17-section t17-tint">
      <div className="t17-container">
        <div className="t17-rule-head t17-reveal">
          <EditableText as="h2" className="t17-kicker" value={section.title || (enabled ? "" : "Letters from readers")} placeholder="Section title" onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t17-quotes">
          {items.map((it, i) => (
            <figure key={i} className="t17-quote t17-reveal">
              <EditableText as="blockquote" value={it.quote ?? ""} placeholder="What a reader said" multiline onCommit={(next) => setItem("items", items, i, { quote: next })} />
              <figcaption>
                <EditableText as="span" className="t17-quote-name" value={it.name ?? ""} placeholder="Name" onCommit={(next) => setItem("items", items, i, { name: next })} />
                {it.role || enabled ? (
                  <EditableText as="span" className="t17-quote-role" value={it.role ?? ""} placeholder="Role" onCommit={(next) => setItem("items", items, i, { role: next })} />
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
