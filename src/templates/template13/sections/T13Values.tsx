"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Made to last", desc: "What sets your pieces apart." },
  { title: "Honest materials", desc: "Keep each point short and concrete." },
  { title: "Clear fit", desc: "One or two short sentences." },
];

// Which grid slots hold a value (1) or stay empty (0), repeated.
const PATTERN = [1, 0, 1, 0, 0, 1, 0, 1];

/** Slot list: values go into the 1-slots in order; total padded to a multiple of 4 (min 8). */
function buildSlots(count: number): Array<number | null> {
  const slots: Array<number | null> = [];
  let next = 0;
  let i = 0;
  while (next < count || slots.length < 8 || slots.length % 4 !== 0) {
    if (PATTERN[i % PATTERN.length] === 1 && next < count) slots.push(next++);
    else slots.push(null);
    i++;
  }
  return slots;
}

/** Values as an icon-tile grid: filled tiles carry a letter, a title and a glass popover with the detail. */
export default function T13Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());
  const lead = items[0]?.desc?.trim();
  const slots = buildSlots(items.length);

  return (
    <section className="t13-section t13-values-section">
      <div className="t13-container t13-split-grid">
        <div>
          <div className="t13-sticky t13-reveal">
            <p className="t13-label">Values</p>
            <h2 className="t13-h2">What we stand for.</h2>
            {lead ? <p className="t13-lead">{lead}</p> : null}
          </div>
        </div>
        <ul className="t13-vgrid">
          {slots.map((slot, pos) => {
            if (slot === null) {
              return <li key={`f${pos}`} className="t13-vtile t13-reveal" data-fill="false" aria-hidden="true" style={{ ["--d" as string]: pos }} />;
            }
            const it = items[slot];
            const letter = (it.title ?? "").trim().slice(0, 1).toUpperCase() || "+";
            return (
              <li key={`v${slot}`} className="t13-vtile t13-reveal" data-fill="true" tabIndex={0} style={{ ["--d" as string]: pos }}>
                <span className="t13-vtile-letter" aria-hidden="true">
                  {letter}
                </span>
                <EditableText
                  as="h3"
                  className="t13-vtile-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[slot % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, slot, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t13-vtile-pop"
                    value={it.desc ?? ""}
                    placeholder={HINTS[slot % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, slot, { desc: next })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
