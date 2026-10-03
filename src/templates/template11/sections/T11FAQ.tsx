"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { planHref, useT11 } from "../ctx";
import { Confetti, IconArrow, IconPhone, IconPlus } from "../icons";

/** "Good to know": heading and a gradient help card beside a pill accordion. All answers open while editing. */
export default function T11FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT11();
  const { profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Good to know");
  const source = enabled ? section.items : section.items?.filter((it) => it.question?.trim());
  const items = (source?.length ? source : [{ question: "", answer: "" }]).map((it) => ({
    question: it.question || "",
    answer: it.answer || "",
  }));

  return (
    <section className="t11-section t11-faq-section">
      <div className="t11-container t11-faq-wrap">
        <header className="t11-faq-head t11-reveal">
          <span className="t11-kicker">FAQ</span>
          <EditableText as="h2" className="t11-h2" value={title} placeholder="Good to know" onCommit={(next) => set({ title: next })} />
          <div className="t11-help">
            <Confetti set="card" />
            <p className="t11-help-title">Still deciding?</p>
            <p>Tell us what you have in mind and ask anything — no question is too small.</p>
            <div className="t11-actions">
              <a className="t11-btn t11-btn-peach t11-btn-sm" href={planHref(ctx)}>
                Plan your event <IconArrow size={15} />
              </a>
              {profile.phone ? (
                <a className="t11-btn t11-btn-glass t11-btn-sm" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} /> Call us
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <div className="t11-faq t11-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t11-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t11-faq-item" data-open={isOpen}>
                <h3 className="t11-faq-h">
                  <button
                    type="button"
                    className="t11-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t11-faq-text"
                      value={it.question}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t11-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t11-faq-a" id={id} inert={!isOpen}>
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
