"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { StatIcon } from "../icons";

/**
 * Values as a deep-blue stat band: an icon tile, the title set large ("30+", "Faith-first")
 * and a small uppercase label. Long titles wrap as statements at a smaller size.
 */
export default function T16Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank stat when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t16-band">
      <span className="t16-band-glow" aria-hidden="true" />
      <div className="t16-container">
        <ul className="t16-stats" data-count={items.length}>
          {items.map((it, idx) => (
            <li key={idx} className="t16-stat t16-reveal" data-long={(it.title ?? "").length > 12}>
              <span className="t16-stat-ico" aria-hidden="true">
                <StatIcon index={idx} />
              </span>
              <EditableText
                as="h3"
                className="t16-stat-title"
                value={it.title ?? ""}
                placeholder="A figure or promise"
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              {it.desc || enabled ? (
                <EditableText
                  as="p"
                  className="t16-stat-label"
                  value={it.desc ?? ""}
                  placeholder="Members, countries…"
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
