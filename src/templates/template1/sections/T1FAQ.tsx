"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { IconPlus } from "../icons";

const FALLBACK = [
  { question: "How do engagements typically start?", answer: "With a short discovery call to understand your goals, followed by a written proposal." },
  { question: "How are fees structured?", answer: "Fixed-fee or retainer, agreed upfront with clear deliverables." },
];

/** Numbered, ruled accordion. All open while editing. */
export default function T1FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  const title = section.title || "Frequently asked questions";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t1-section t1-grey">
      <div className="t1-container">
        <div className="t1-head t1-head-single t1-reveal">
          <div>
            <span className="t1-over">FAQ</span>
            <EditableText as="h2" className="t1-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>
        <div className="t1-faq t1-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            return (
              <div key={idx} className="t1-faq-item" data-open={isOpen}>
                <button type="button" className="t1-faq-q" aria-expanded={isOpen} onClick={() => !enabled && setOpen(isOpen ? null : idx)}>
                  <span className="t1-faq-num">{pad2(idx + 1)}</span>
                  <EditableText as="h3" value={it.question} placeholder="Question" onCommit={(next) => setItem("items", items, idx, { question: next })} />
                  <span className="t1-faq-icon" aria-hidden="true">
                    <IconPlus />
                  </span>
                </button>
                <div className="t1-faq-a">
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
