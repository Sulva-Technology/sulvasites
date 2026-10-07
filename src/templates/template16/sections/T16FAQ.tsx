"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconChevron } from "../icons";

/** Centred heading over an accordion of rounded cards; the round chevron turns solid when open. All open while editing. */
export default function T16FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(null);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Frequently asked questions");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());

  return (
    <section className="t16-section">
      <div className="t16-container t16-container-faq">
        <header className="t16-center-head t16-reveal">
          <p className="t16-kicker">Support</p>
          <EditableText as="h2" className="t16-h2" value={title} placeholder="Frequently asked questions" onCommit={(next) => set({ title: next })} />
          <p className="t16-head-note">Everything you need to know before joining.</p>
        </header>

        <div className="t16-faq t16-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t16-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t16-faq-item" data-open={isOpen}>
                <h3 className="t16-faq-h">
                  <button
                    type="button"
                    className="t16-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      value={it.question ?? ""}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t16-faq-ico" aria-hidden="true">
                      <IconChevron />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t16-faq-a" id={id} inert={!isOpen}>
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
