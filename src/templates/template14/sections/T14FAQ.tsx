"use client";

import { useState } from "react";
import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT14 } from "../ctx";
import { IconChevronDown } from "../icons";

/** Centred heading over a hairline accordion. All answers open while editing. */
export default function T14FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { baseUrl, pageKind } = useT14();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Questions, answered.");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());

  return (
    <section className="t14-section t14-faq2">
      <div className="t14-faq2-in">
        <header className="t14-faq2-head t14-reveal">
          <EditableText
            as="h2"
            className="t14-h2"
            value={title}
            placeholder="Questions, answered."
            onCommit={(next) => set({ title: next })}
          />
        </header>

        <div className="t14-faq2-list t14-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t14-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t14-faq2-item" data-open={isOpen}>
                <h3 className="t14-faq2-h">
                  <button
                    type="button"
                    className="t14-faq2-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t14-faq2-text"
                      value={it.question ?? ""}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t14-faq2-ico" aria-hidden="true">
                      <IconChevronDown size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t14-faq2-a" id={id} inert={!isOpen}>
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

        {pageKind !== "contact" ? (
          <div className="t14-faq2-foot t14-reveal">
            <span>Still stuck?</span>
            <Link className="t14-pill t14-pill-black" href={`${baseUrl}/contact`}>
              Contact us
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
