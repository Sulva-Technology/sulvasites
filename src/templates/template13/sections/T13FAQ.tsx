"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { FAQSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT13 } from "../ctx";
import { IconPlus } from "../icons";

/** Centred title over numbered pill rows. Answers animate open (0fr to 1fr); all open while editing. */
export default function T13FAQ({ section, sectionIndex }: { section: FAQSection; sectionIndex?: number }) {
  const { profile, shop } = useT13();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [open, setOpen] = useState<number | null>(0);
  if (!enabled && !section.items?.some((it) => it.question?.trim())) return null;
  const title = section.title || (enabled ? "" : "Questions");
  // Editor: the real items untouched (one blank row when empty). Visitors: answered questions only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ question: "", answer: "" }]
    : section.items.filter((it) => it.question?.trim());
  const help = profile.email
    ? { href: buildEmailLink(profile.email), text: profile.email, external: false }
    : profile.whatsapp
      ? { href: buildWhatsAppLink(profile.whatsapp), text: "WhatsApp us", external: true }
      : null;

  return (
    <section className="t13-section t13-faq-section">
      <div className="t13-container t13-faq-wrap">
        <header className="t13-faq-head t13-reveal">
          <p className="t13-label">FAQ</p>
          <EditableText as="h2" className="t13-faq-title" value={title} placeholder="Questions" onCommit={(next) => set({ title: next })} />
          {shop ? <p className="t13-lead">Quick answers about orders, sizing and delivery.</p> : null}
        </header>

        <div className="t13-faq">
          {items.map((it, idx) => {
            const isOpen = enabled || open === idx;
            const id = `t13-faq-${sectionIndex ?? 0}-${idx}`;
            return (
              <div key={idx} className="t13-faq-item t13-reveal" data-open={isOpen} style={{ ["--d" as string]: idx }}>
                <h3 className="t13-faq-h">
                  <button
                    type="button"
                    className="t13-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => !enabled && setOpen(isOpen ? null : idx)}
                  >
                    <span className="t13-faq-no t13-mono" aria-hidden="true">
                      {pad2(idx + 1)}
                    </span>
                    <EditableText
                      as="span"
                      className="t13-faq-text"
                      value={it.question ?? ""}
                      placeholder="Question"
                      onCommit={(next) => setItem("items", items, idx, { question: next })}
                    />
                    <span className="t13-faq-ico" aria-hidden="true">
                      <IconPlus size={18} />
                    </span>
                  </button>
                </h3>
                {/* Closed answers stay in the DOM for the height animation but leave the a11y tree / tab order. */}
                <div className="t13-faq-a" id={id} inert={!isOpen}>
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

        {help ? (
          <p className="t13-faq-foot">
            Still need help?{" "}
            <a href={help.href} {...(help.external ? { target: "_blank", rel: "noreferrer" } : {})}>
              {help.text}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
