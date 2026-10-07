"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { toRoman, useSectionEditor } from "@/templates/shared/edit";

/** Principles as a ruled list with italic roman numerals. */
export default function T17Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : (section.items ?? []).filter((it) => it.title?.trim());
  if (items.length === 0) return null;
  return (
    <section className="t17-section t17-tint">
      <div className="t17-container">
        <div className="t17-rule-head t17-reveal">
          <h2 className="t17-kicker">What readers can expect</h2>
        </div>
        <ul className="t17-values">
          {items.map((it, i) => (
            <li key={i} className="t17-reveal">
              <span className="t17-roman">{toRoman(i + 1)}.</span>
              <EditableText as="h3" className="t17-h3" value={it.title ?? ""} placeholder="Principle" onCommit={(next) => setItem("items", items, i, { title: next })} />
              <EditableText as="p" className="t17-body" value={it.desc ?? ""} placeholder="A sentence about it" multiline onCommit={(next) => setItem("items", items, i, { desc: next })} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
