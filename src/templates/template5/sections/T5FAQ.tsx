"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { question: "How do I secure my booking?", answer: "A small booking fee holds your slot and is deducted from your total on the day." },
  { question: "Can I reschedule?", answer: "Yes — just let us know at least 24 hours before your appointment and we'll move your booking." },
  { question: "Do you travel?", answer: "We do. Travel fees depend on location — send the address and we'll quote you." },
];

/** "Booking policies & FAQ" as rounded accordion cards. All open while editing. */
export default function T5FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  const title = section.title || "Booking policies & FAQ";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t5-section t5-blush">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">Good to know</span>
          <EditableText as="h2" className="t5-title" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t5-faq t5-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            return (
              <div key={idx} className="t5-faq-item" data-open={isOpen}>
                <button type="button" className="t5-faq-q" aria-expanded={isOpen} onClick={() => !enabled && setOpen(isOpen ? null : idx)}>
                  <EditableText as="h3" value={it.question} placeholder="Question" onCommit={(next) => setItem("items", items, idx, { question: next })} />
                  <span className="t5-faq-sign" aria-hidden="true">
                    +
                  </span>
                </button>
                <div className="t5-faq-a">
                  <div>
                    <EditableText as="p" value={it.answer} placeholder="Answer" multiline onCommit={(next) => setItem("items", items, idx, { answer: next })} />
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
