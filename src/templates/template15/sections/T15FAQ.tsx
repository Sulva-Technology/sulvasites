"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { enquireHref, useT15 } from "../ctx";
import { IconArrow, IconPlus } from "../icons";

/** Heading and an "ask us anything" note beside a glass accordion. All answers open while editing. */
export default function T15FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT15();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Good to know");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());

  return (
    <section className="t15-section t15-faq-section">
      <div className="t15-container t15-faq-wrap">
        <header className="t15-faq-head t15-reveal">
          <p className="t15-eyebrow">FAQ</p>
          <EditableText as="h2" className="t15-h2" value={title} placeholder="Good to know" onCommit={(next) => set({ title: next })} />
          <p className="t15-muted">Can&apos;t find your answer? Ask us about any car, viewing or service.</p>
          <a className="t15-textlink" href={enquireHref(ctx)}>
            Ask a question <IconArrow size={15} />
          </a>
        </header>

        <div className="t15-faq t15-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t15-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t15-faq-item t15-glass" data-open={isOpen}>
                <h3 className="t15-faq-h">
                  <button
                    type="button"
                    className="t15-faq-q"
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
                    <span className="t15-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t15-faq-a" id={id} inert={!isOpen}>
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
