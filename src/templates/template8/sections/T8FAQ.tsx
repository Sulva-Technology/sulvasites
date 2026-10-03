"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { bookHref, useT8 } from "../ctx";
import { IconArrow, IconPhone, IconPlus } from "../icons";

/** Prominent FAQ: heading + help card beside a rounded accordion. All answers open while editing. */
export default function T8FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT8();
  const { profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || "Frequently asked questions";
  const source = enabled ? section.items : section.items?.filter((it) => it.question?.trim());
  const items = (source?.length ? source : [{ question: "", answer: "" }]).map((it) => ({
    question: it.question || "Question",
    answer: it.answer || "",
  }));

  return (
    <section className="t8-section t8-faq-section">
      <div className="t8-container t8-faq-wrap">
        <header className="t8-faq-head t8-reveal">
          <span className="t8-eyebrow">FAQ</span>
          <EditableText as="h2" className="t8-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          <div className="t8-help">
            <p className="t8-help-title">Still have a question?</p>
            <p className="t8-muted">Our team is happy to help before you book.</p>
            <div className="t8-help-actions">
              {profile.phone ? (
                <a className="t8-btn t8-btn-sm" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} /> Call us
                </a>
              ) : null}
              <a className="t8-textlink" href={bookHref(ctx)}>
                Book a visit <IconArrow size={15} />
              </a>
            </div>
          </div>
        </header>

        <div className="t8-faq t8-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t8-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t8-faq-item" data-open={isOpen}>
                <h3 className="t8-faq-h">
                  <button
                    type="button"
                    className="t8-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t8-faq-text"
                      value={it.question}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t8-faq-ico" aria-hidden="true">
                      <IconPlus size={16} />
                    </span>
                  </button>
                </h3>
                <div className="t8-faq-a" id={id}>
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
