"use client";

import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK_QUOTE = "I have never felt so beautiful. My makeup lasted from the ceremony to the very last dance.";

/** One large italic quote at a time on a dark band; auto-advances (not while editing). */
export default function T5Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [active, setActive] = useState(0);
  const title = section.title || "Kind words";
  const items = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Happy client",
    role: t.role || "Bride",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));

  useEffect(() => {
    if (enabled || items.length < 2) return;
    const t = window.setInterval(() => setActive((v) => (v + 1) % items.length), 7000);
    return () => window.clearInterval(t);
  }, [enabled, items.length]);

  return (
    <section className="t5-section t5-dark">
      <div className="t5-container">
        <div className="t5-quote-wrap t5-reveal">
          <EditableText as="span" className="t5-eyebrow" value={title} placeholder="Kind words" onCommit={(next) => set({ title: next })} />
          <span className="t5-quote-mark" aria-hidden="true" style={{ marginTop: 28 }}>
            “
          </span>
          <div className="t5-quote-slide" aria-live="polite">
            {items.map((t, idx) => (
              <figure key={idx} data-active={idx === active} style={{ margin: 0 }}>
                <EditableText
                  as="blockquote"
                  value={t.quote}
                  placeholder="Quote"
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { quote: next })}
                />
                <figcaption className="t5-quote-by">
                  <EditableText as="span" value={t.name} placeholder="Name" onCommit={(next) => setItem("items", items, idx, { name: next })} />
                  {" — "}
                  <EditableText as="span" value={t.role} placeholder="Role" onCommit={(next) => setItem("items", items, idx, { role: next })} />
                </figcaption>
              </figure>
            ))}
          </div>
          {items.length > 1 ? (
            <div className="t5-dots">
              {items.map((_, idx) => (
                <button key={idx} type="button" aria-label={`Show review ${idx + 1}`} aria-current={idx === active} onClick={() => setActive(idx)} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
