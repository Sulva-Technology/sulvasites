"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { applyHref, useT10 } from "../ctx";
import { IconCalendar, IconPhone, IconPlus } from "../icons";

/** "Admissions questions": heading and a help card beside a rounded accordion. All answers open while editing. */
export default function T10FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT10();
  const { profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Admissions questions");
  const source = enabled ? section.items : section.items?.filter((it) => it.question?.trim());
  const items = (source?.length ? source : [{ question: "", answer: "" }]).map((it) => ({
    question: it.question || "",
    answer: it.answer || "",
  }));

  return (
    <section className="t10-section t10-faq-section">
      <div className="t10-container t10-faq-wrap">
        <header className="t10-faq-head t10-reveal">
          <span className="t10-kicker">FAQ</span>
          <EditableText as="h2" className="t10-h2" value={title} placeholder="Admissions questions" onCommit={(next) => set({ title: next })} />
          <div className="t10-help">
            <p className="t10-help-title">Still have a question?</p>
            <p>Come and see us, or talk to the admissions team.</p>
            <div className="t10-actions">
              <a className="t10-btn t10-btn-sm" href={applyHref(ctx, { intent: "visit" })}>
                <IconCalendar size={15} /> Book a visit
              </a>
              {profile.phone ? (
                <a className="t10-btn t10-btn-sm t10-btn-outline" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} /> Call us
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <div className="t10-faq t10-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t10-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t10-faq-item" data-open={isOpen}>
                <h3 className="t10-faq-h">
                  <button
                    type="button"
                    className="t10-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t10-faq-text"
                      value={it.question}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t10-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                <div className="t10-faq-a" id={id}>
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
