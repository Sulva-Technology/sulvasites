"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconChevron } from "../icons";

const FALLBACK = [
  { question: "How do I book a viewing?", answer: "Use the form on our contact page or call us — we'll confirm a time within one business day." },
  { question: "Do you verify property documents?", answer: "Yes. Title and approvals are checked before listing, and copies are shared with serious buyers." },
];

/** Two-column accordion cards. All open while editing. */
export default function T6FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  const title = section.title || "Frequently asked questions";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t6-section">
      <div className="t6-container">
        <div className="t6-head t6-reveal" style={{ justifyContent: "center", textAlign: "center" }}>
          <div>
            <span className="t6-kicker">FAQ</span>
            <EditableText as="h2" className="t6-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>

        <div className="t6-faq t6-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            return (
              <div key={idx} className="t6-faq-item" data-open={isOpen}>
                <button
                  type="button"
                  className="t6-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                >
                  <EditableText
                    as="h3"
                    value={it.question}
                    placeholder="Question"
                    onCommit={(next) => setItem("items", items, idx, { question: next })}
                  />
                  <span className="t6-chev" aria-hidden="true">
                    <IconChevron />
                  </span>
                </button>
                <div className="t6-faq-a">
                  <div>
                    <EditableText
                      as="p"
                      value={it.answer}
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
