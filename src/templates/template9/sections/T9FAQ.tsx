"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { joinHref, useT9 } from "../ctx";
import { IconArrow, IconPhone, IconPlus } from "../icons";

/** FAQ: giant sticky heading with a help box beside a numbered, hard-edged accordion. All answers open while editing. */
export default function T9FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT9();
  const { profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || "Questions, answered";
  const source = enabled ? section.items : section.items?.filter((it) => it.question?.trim());
  const items = (source?.length ? source : [{ question: "", answer: "" }]).map((it) => ({
    question: it.question || "",
    answer: it.answer || "",
  }));

  return (
    <section className="t9-section t9-faq-section">
      <div className="t9-container t9-faq-wrap">
        <header className="t9-faq-head t9-reveal">
          <span className="t9-kicker t9-kicker-dark">FAQ</span>
          <EditableText as="h2" className="t9-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          <div className="t9-help">
            <p className="t9-help-title">Still got questions?</p>
            <p>Talk to the team before your first session.</p>
            <div className="t9-actions">
              {profile.phone ? (
                <a className="t9-btn t9-btn-sm" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} /> Call us
                </a>
              ) : null}
              <a className="t9-textlink" href={joinHref(ctx)}>
                Start free trial <IconArrow size={15} />
              </a>
            </div>
          </div>
        </header>

        <div className="t9-faq t9-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t9-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t9-faq-item" data-open={isOpen}>
                <h3 className="t9-faq-h">
                  <button
                    type="button"
                    className="t9-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <span className="t9-faq-no" aria-hidden="true">
                      {pad2(idx + 1)}
                    </span>
                    <EditableText
                      as="span"
                      className="t9-faq-text"
                      value={it.question}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t9-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t9-faq-a" id={id} inert={!isOpen}>
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
