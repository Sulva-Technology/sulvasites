"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink } from "@/templates/shared/links";
import { useT7 } from "../ctx";
import { IconPlus, Ornament } from "../icons";

/** Title column beside a ruled accordion. All answers open while editing. */
export default function T7FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { profile } = useT7();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || "Good to know";
  const source = enabled ? section.items : section.items?.filter((it) => it.question?.trim());
  const items = (source?.length ? source : [{ question: "", answer: "" }]).map((it) => ({
    question: it.question || "Question",
    answer: it.answer || "",
  }));

  return (
    <section className="t7-section t7-faq-section">
      <div className="t7-container t7-faq-wrap">
        <header className="t7-faq-head t7-reveal">
          <span className="t7-eyebrow">
            <Ornament /> Questions
          </span>
          <EditableText as="h2" className="t7-h2" value={title} placeholder="FAQ title" onCommit={(next) => set({ title: next })} />
          {profile.phone ? (
            <p className="t7-muted">
              Anything else? Call us on <a href={buildTelLink(profile.phone)}>{profile.phone}</a>.
            </p>
          ) : null}
        </header>

        <div className="t7-faq t7-reveal">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t7-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t7-faq-item" data-open={isOpen}>
                <button
                  type="button"
                  className="t7-faq-q"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                >
                  <EditableText
                    as="h3"
                    value={it.question}
                    placeholder="Question"
                    onCommit={(next) => setItem("items", items, idx, { question: next })}
                  />
                  <span className="t7-faq-ico" aria-hidden="true">
                    <IconPlus size={16} />
                  </span>
                </button>
                <div className="t7-faq-a" id={id}>
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
