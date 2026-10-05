"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Made to last", desc: "What sets your products apart." },
  { title: "Honest materials", desc: "Keep each point short and concrete." },
  { title: "Clear fit", desc: "One or two short sentences." },
];

/** Values as three hairline-topped columns with large numerals. */
export default function T14Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t14-section t14-values-section">
      <div className="t14-container">
        <ol className="t14-values" data-count={items.length}>
          {items.map((it, idx) => (
            <li key={idx} className="t14-value t14-reveal">
              <span className="t14-value-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <EditableText
                as="h3"
                className="t14-value-title"
                value={it.title ?? ""}
                placeholder={HINTS[idx % HINTS.length].title}
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              {it.desc || enabled ? (
                <EditableText
                  as="p"
                  className="t14-muted"
                  value={it.desc ?? ""}
                  placeholder={HINTS[idx % HINTS.length].desc}
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
