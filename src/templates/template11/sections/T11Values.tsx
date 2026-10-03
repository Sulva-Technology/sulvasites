"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Tell us the idea", desc: "The occasion, the date, the guest count and the feeling you want." },
  { title: "We plan the details", desc: "Venue, vendors, styling and a run-of-show you can sign off." },
  { title: "Enjoy the day", desc: "Keep each step short and concrete." },
];

/** Values as "How it works": big gradient step numbers joined by a dotted line (a column on phones). */
export default function T11Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank step when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section className="t11-section t11-tint t11-steps-section">
      <div className="t11-container">
        <header className="t11-head t11-head-center t11-reveal">
          <span className="t11-kicker">How it works</span>
          <h2 className="t11-h2">
            From first idea to <span className="t11-hl">last dance</span>
          </h2>
        </header>

        <ol className="t11-steps" data-count={items.length} data-cols={items.length <= 4 ? items.length : 3}>
          {items.map((it, idx) => (
            <li key={idx} className="t11-step t11-reveal">
              <span className="t11-step-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <EditableText
                as="h3"
                className="t11-step-title"
                value={it.title}
                placeholder={HINTS[idx % HINTS.length].title}
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              {it.desc || enabled ? (
                <EditableText
                  as="p"
                  className="t11-muted"
                  value={it.desc}
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
