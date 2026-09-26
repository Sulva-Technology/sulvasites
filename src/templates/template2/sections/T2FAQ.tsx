"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { question: "What kind of projects do you take on?", answer: "Anything with a story worth telling — from brand launches to books." },
  { question: "How do we start?", answer: "Send us a note about the idea. We'll reply with questions, then a proposal." },
];

/** FAQ as an always-open interview (Q. / A.) — no accordion. */
export default function T2FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "The Q&A";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    question: it.question || FALLBACK[i % FALLBACK.length].question,
    answer: it.answer || FALLBACK[i % FALLBACK.length].answer,
  }));

  return (
    <section className="t2-section t2-section-rule">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Interview</span>
            <EditableText as="h2" className="t2-title" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>
        <div className="t2-qa">
          {items.map((it, idx) => (
            <div key={idx} className="t2-qa-item t2-reveal">
              <div className="t2-qa-q">
                <b aria-hidden="true">Q.</b>
                <EditableText as="h3" value={it.question} placeholder="Question" onCommit={(next) => setItem("items", items, idx, { question: next })} />
              </div>
              <div className="t2-qa-a">
                <b aria-hidden="true">A.</b>
                <EditableText as="p" value={it.answer} placeholder="Answer" multiline onCommit={(next) => setItem("items", items, idx, { answer: next })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
