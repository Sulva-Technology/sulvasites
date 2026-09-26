"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT4 } from "../ctx";
import { IconArrow } from "../icons";

const FALLBACK = [
  { question: "How long does setup take?", answer: "Most people are up and running in under five minutes." },
  { question: "Is my data secure?", answer: "Yes. Everything is encrypted in transit and at rest, and backed up daily." },
];

/** FAQ with a sticky aside ("still have questions?") and accordion cards. */
export default function T4FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { baseUrl } = useT4();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  const title = section.title || "Frequently asked questions";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t4-section t4-soft-bg">
      <div className="t4-container t4-faq-wrap">
        <div className="t4-faq-aside t4-reveal">
          <span className="t4-label">FAQ</span>
          <EditableText as="h2" className="t4-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          <div className="t4-help">
            <b>Still have questions?</b>
            <span className="t4-muted">Our team is happy to help — usually within a few hours.</span>
            <a className="t4-textlink" href={`${baseUrl}/contact`}>
              Contact us <IconArrow size={16} />
            </a>
          </div>
        </div>
        <div className="t4-faq t4-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            return (
              <div key={idx} className="t4-faq-item" data-open={isOpen}>
                <button type="button" className="t4-faq-q" aria-expanded={isOpen} onClick={() => !enabled && setOpen(isOpen ? null : idx)}>
                  <EditableText as="h3" value={it.question} placeholder="Question" onCommit={(next) => setItem("items", items, idx, { question: next })} />
                  <span className="t4-plus" aria-hidden="true">
                    +
                  </span>
                </button>
                <div className="t4-faq-a">
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
