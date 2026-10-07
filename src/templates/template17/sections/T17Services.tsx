"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

/** "What I write about": numbered columns under a rule, like a contents page. */
export default function T17Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : (section.items ?? []).filter((it) => it.title?.trim());
  if (items.length === 0) return null;
  return (
    <section className="t17-section">
      <div className="t17-container">
        <div className="t17-rule-head t17-reveal">
          <h2 className="t17-kicker">What you&apos;ll find here</h2>
        </div>
        <ol className="t17-contents">
          {items.map((it, i) => (
            <li key={i} className="t17-reveal">
              <span className="t17-num">{pad2(i + 1)}</span>
              <EditableText as="h3" className="t17-h3" value={it.title ?? ""} placeholder="Topic" onCommit={(next) => setItem("items", items, i, { title: next })} />
              <EditableText as="p" className="t17-body" value={it.desc ?? ""} placeholder="What readers will find" multiline onCommit={(next) => setItem("items", items, i, { desc: next })} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
