"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Tell us about the job", desc: "Call, message or send the quote form with a few details." },
  { title: "Site visit & quote", desc: "We look at the job and give you a clear written price." },
  { title: "We get it done", desc: "Keep each step short and concrete." },
];

/** Values as a numbered process on a charcoal band: big stencil numbers on an orange rail. */
export default function T12Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank step when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t12-section t12-dark t12-process-section">
      <div className="t12-container">
        <header className="t12-head t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" /> How it works
          </p>
          <h2 className="t12-h2">From first call to finished job</h2>
        </header>

        <ol className="t12-process" data-count={items.length} data-cols={items.length <= 4 ? items.length : 3}>
          {items.map((it, idx) => (
            <li key={idx} className="t12-step t12-reveal">
              <span className="t12-step-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <EditableText
                as="h3"
                className="t12-step-title"
                value={it.title ?? ""}
                placeholder={HINTS[idx % HINTS.length].title}
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              {it.desc || enabled ? (
                <EditableText
                  as="p"
                  className="t12-step-desc"
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
