"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconCheck, Scribble } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "What makes you different", desc: "Small classes, caring teachers, a clear plan for every learner." },
  { title: "Another reason", desc: "How you support progress and keep families informed." },
  { title: "Third reason", desc: "Keep each one short and concrete." },
];

/** Values as "Why learners choose us": a sticky heading beside rounded cards with sunflower check badges. */
export default function T10Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section className="t10-section t10-tint t10-values-section">
      <div className="t10-container t10-values-wrap">
        <header className="t10-values-head t10-reveal">
          <span className="t10-kicker">Why us</span>
          <h2 className="t10-h2">
            Why learners{" "}
            <span className="t10-hl">
              choose us
              <Scribble className="t10-scribble" />
            </span>
          </h2>
          <p className="t10-muted">The things we care about in every class, every day.</p>
        </header>

        <ul className="t10-values" data-count={items.length} data-odd={items.length % 2 === 1}>
          {items.map((it, idx) => (
            <li key={idx} className="t10-value t10-reveal">
              <span className="t10-value-badge" aria-hidden="true">
                <IconCheck size={18} />
              </span>
              <div>
                <EditableText
                  as="h3"
                  className="t10-value-title"
                  value={it.title}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t10-muted"
                    value={it.desc}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
