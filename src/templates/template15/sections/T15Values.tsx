"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

/**
 * Values as glass stat panels: the title is set large ("650+", "Since 1998", "Hand-picked")
 * over a muted description. Short titles read as figures; longer ones wrap as statements.
 */
export default function T15Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank panel when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t15-section t15-stats-section">
      <div className="t15-container">
        <ul className="t15-stats" data-count={items.length}>
          {items.map((it, idx) => (
            <li key={idx} className="t15-stat t15-glass t15-reveal" data-long={(it.title ?? "").length > 14}>
              <EditableText
                as="h3"
                className="t15-stat-title"
                value={it.title ?? ""}
                placeholder="A figure or promise"
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              {it.desc || enabled ? (
                <EditableText
                  as="p"
                  className="t15-muted"
                  value={it.desc ?? ""}
                  placeholder="What it means for buyers"
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
