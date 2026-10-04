"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { quoteHref, useT12 } from "../ctx";
import { Hazard, IconArrow, IconPhone, IconPlus } from "../icons";

/** Heading and a charcoal "need a hand?" card beside a square accordion. All answers open while editing. */
export default function T12FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const ctx = useT12();
  const { profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Common questions");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());

  return (
    <section className="t12-section t12-faq-section">
      <div className="t12-container t12-faq-wrap">
        <header className="t12-faq-head t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" /> FAQ
          </p>
          <EditableText as="h2" className="t12-h2" value={title} placeholder="Common questions" onCommit={(next) => set({ title: next })} />
          <div className="t12-help t12-dark">
            <Hazard className="t12-help-stripe" />
            <p className="t12-help-title">Need a hand?</p>
            <p>Tell us about the job and ask anything — we&apos;re happy to talk it through.</p>
            <div className="t12-actions">
              <a className="t12-btn t12-btn-sm" href={quoteHref(ctx)}>
                Get a quote <IconArrow size={15} />
              </a>
              {profile.phone ? (
                <a className="t12-btn t12-btn-outline-light t12-btn-sm" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} /> Call us
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <div className="t12-faq t12-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t12-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t12-faq-item" data-open={isOpen}>
                <h3 className="t12-faq-h">
                  <button
                    type="button"
                    className="t12-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <EditableText
                      as="span"
                      className="t12-faq-text"
                      value={it.question ?? ""}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t12-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t12-faq-a" id={id} inert={!isOpen}>
                  <div>
                    <EditableText
                      as="p"
                      value={it.answer ?? ""}
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
