"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconPlus } from "../icons";

/** Heading beside a hairline accordion. All answers open while editing. */
export default function T14FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Questions");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());

  return (
    <section className="t14-section t14-faq-section">
      <div className="t14-container t14-split">
        <header className="t14-head t14-reveal">
          <p className="t14-label">FAQ</p>
          <EditableText as="h2" className="t14-h2" value={title} placeholder="Questions" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t14-faq t14-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t14-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t14-faq-item" data-open={isOpen}>
                <h3 className="t14-faq-h">
                  <button
                    type="button"
                    className="t14-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t14-faq-text"
                      value={it.question ?? ""}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t14-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t14-faq-a" id={id} inert={!isOpen}>
                  <div>
                    <EditableText
                      as="p"
                      value={it.answer ?? ""}
                      placeholder="Answer"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { answer: next })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
