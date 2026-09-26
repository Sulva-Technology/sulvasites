"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

const FALLBACK_QUOTE = "Honestly the easiest thing we've adopted all year. Everyone just started using it.";

/** Masonry "wall of love" of short review cards. */
export default function T4Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Loved by the people who use it";
  const items = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Happy customer",
    role: t.role || "Customer",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));

  return (
    <section className="t4-section">
      <div className="t4-container">
        <div className="t4-head t4-center t4-reveal">
          <span className="t4-label">Reviews</span>
          <EditableText as="h2" className="t4-h2" value={title} placeholder="Reviews title" onCommit={(next) => set({ title: next })} />
        </div>
        <div className="t4-wall">
          {items.map((t, idx) => (
            <figure key={idx} className="t4-post t4-reveal">
              <figcaption className="t4-post-head">
                <span className="t4-avatar" aria-hidden="true">
                  {initials(t.name)}
                </span>
                <span>
                  <EditableText as="div" value={t.name} placeholder="Name" style={{ fontWeight: 700 }} onCommit={(next) => setItem("items", items, idx, { name: next })} />
                  <div className="t4-muted" style={{ fontSize: 13.5 }}>
                    <EditableText as="span" value={t.role} placeholder="Role" onCommit={(next) => setItem("items", items, idx, { role: next })} />
                    {t.company ? ` · ${t.company}` : null}
                  </div>
                </span>
              </figcaption>
              <EditableText
                as="blockquote"
                value={t.quote}
                placeholder="Quote"
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
