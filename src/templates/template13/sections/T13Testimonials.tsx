"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconQuote } from "../icons";

/** Customer words as large Italiana pull quotes (no star row: testimonials carry no rating). */
export default function T13Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "What customers say");
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());

  return (
    <section className="t13-section t13-tint t13-reviews-section">
      <div className="t13-container">
        <header className="t13-head t13-head-center t13-reveal">
          <p className="t13-label">Reviews</p>
          <EditableText as="h2" className="t13-h2" value={title} placeholder="What customers say" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t13-reviews" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t13-review t13-reveal">
              <span className="t13-review-mark" aria-hidden="true">
                <IconQuote size={26} />
              </span>
              <EditableText
                as="blockquote"
                className="t13-review-quote"
                value={t.quote ?? ""}
                placeholder="What a customer said about their order."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t13-review-cite">
                  {t.name || enabled ? (
                    <EditableText
                      as="span"
                      className="t13-review-name"
                      value={t.name ?? ""}
                      placeholder="Name"
                      onCommit={(next) => setItem("items", items, idx, { name: next })}
                    />
                  ) : null}
                  {t.role || t.company || enabled ? (
                    <span className="t13-review-role">
                      <EditableText
                        as="span"
                        value={t.role ?? ""}
                        placeholder="City"
                        onCommit={(next) => setItem("items", items, idx, { role: next })}
                      />
                      {t.company ? `${t.role ? ", " : ""}${t.company}` : null}
                    </span>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
