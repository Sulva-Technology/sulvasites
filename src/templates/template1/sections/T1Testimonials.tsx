"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, pad2, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow, IconArrowLeft } from "../icons";

const FALLBACK_QUOTE =
  "They took the time to understand our business and delivered recommendations we could act on immediately. The results spoke for themselves.";

/** Dark band: heading + arrows on the left, one quote card at a time on the right. */
export default function T1Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const [active, setActive] = useState(0);
  const title = section.title || "What our clients say";
  const items = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Client name",
    role: t.role || "Managing Director",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));
  const go = (d: number) => setActive((v) => (v + d + items.length) % items.length);

  return (
    <section className="t1-section t1-dark">
      <div className="t1-container t1-testi">
        <div className="t1-reveal">
          <span className="t1-over">Testimonials</span>
          <EditableText as="h2" className="t1-h2" value={title} placeholder="Title" style={{ marginTop: 16 }} onCommit={(next) => set({ title: next })} />
          {items.length > 1 ? (
            <div className="t1-testi-nav">
              <button type="button" className="t1-square" aria-label="Previous testimonial" onClick={() => go(-1)}>
                <IconArrowLeft />
              </button>
              <button type="button" className="t1-square" aria-label="Next testimonial" onClick={() => go(1)}>
                <IconArrow />
              </button>
            </div>
          ) : null}
        </div>

        <div className="t1-quote-card t1-reveal" aria-live="polite">
          {items.map((t, idx) => (
            <figure key={idx} data-active={idx === active}>
              <EditableText as="blockquote" value={t.quote} placeholder="Quote" multiline onCommit={(next) => setItem("items", items, idx, { quote: next })} />
              <figcaption className="t1-person">
                <span className="t1-avatar" aria-hidden="true">
                  {initials(t.name)}
                </span>
                <span>
                  <EditableText as="div" value={t.name} placeholder="Name" style={{ fontWeight: 600 }} onCommit={(next) => setItem("items", items, idx, { name: next })} />
                  <div className="t1-muted" style={{ fontSize: 14 }}>
                    <EditableText as="span" value={t.role} placeholder="Role" onCommit={(next) => setItem("items", items, idx, { role: next })} />
                    {t.company ? `, ${t.company}` : null}
                  </div>
                </span>
                <span className="t1-count">
                  {pad2(idx + 1)} / {pad2(items.length)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
