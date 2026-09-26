"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { toRoman, useSectionEditor } from "@/templates/shared/edit";
import { bookHref, useT5 } from "../ctx";

const FALLBACK: UseCasesSection["items"] = [
  { title: "The Everyday", description: "A fresh, natural look for dinners, meetings and moments you want to feel your best." },
  { title: "The Bride", description: "Consultation, trial and wedding-day glam — plus touch-up kit to take with you." },
  { title: "The Party", description: "Glam for you and your group, at the studio or on location." },
];

/** Use cases as arched "package" cards; the middle one is highlighted. */
export default function T5UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT5();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Signature packages";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));
  const highlight = items.length >= 3 ? 1 : -1;

  return (
    <section className="t5-section t5-blush">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">Packages</span>
          <EditableText as="h2" className="t5-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          {description || enabled ? (
            <EditableText
              as="p"
              className="t5-lead"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </div>

        <div className="t5-packages">
          {items.map((it, idx) => (
            <article key={idx} className="t5-package t5-reveal" data-highlight={idx === highlight}>
              {idx === highlight ? <span className="t5-package-tag">Most loved</span> : null}
              <span className="t5-package-num">{toRoman(idx + 1)}.</span>
              <EditableText
                as="h3"
                className="t5-h3"
                value={it.title}
                placeholder="Package name"
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              <EditableText
                as="p"
                className="t5-muted"
                value={it.description}
                placeholder="What's included"
                multiline
                onCommit={(next) => setItem("items", items, idx, { description: next })}
              />
              <a
                className={idx === highlight ? "t5-btn t5-btn-rose" : "t5-btn t5-btn-ghost"}
                href={it.linkHref || bookHref(ctx, it.title)}
              >
                <EditableText
                  as="span"
                  value={it.linkText || "Book this"}
                  placeholder="Button"
                  onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
