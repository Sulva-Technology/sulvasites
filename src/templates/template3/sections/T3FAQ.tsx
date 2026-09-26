"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "../edit";
import { T3Index } from "../ui";

const FALLBACK = [
  { question: "How do we get started?", answer: "Send a short note about your goals and timeline — I'll reply with next steps." },
  { question: "What does a typical project cost?", answer: "Every project is scoped individually. You'll get a clear proposal before anything begins." },
];

/** Accordion with a sticky title. All answers stay open while editing. */
export default function T3FAQ({
  section,
  sectionIndex,
  n,
}: {
  section: FAQSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  const title = section.title || "Questions, answered";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t3-section">
      <div className="t3-container t3-split">
        <div className="t3-sticky t3-reveal">
          <T3Index n={n} label="FAQ" />
          <EditableText
            as="h2"
            className="t3-title"
            value={title}
            placeholder="FAQ title"
            style={{ marginTop: 20 }}
            onCommit={(next) => set({ title: next })}
          />
        </div>

        <div className="t3-faq t3-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            return (
              <div key={idx} className="t3-faq-item" data-open={isOpen}>
                <button
                  type="button"
                  className="t3-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                >
                  <EditableText
                    as="h3"
                    value={it.question}
                    placeholder="Question"
                    onCommit={(next) => setItem("items", items, idx, { question: next })}
                  />
                  <span className="t3-plus" aria-hidden="true" />
                </button>
                <div className="t3-faq-a">
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
