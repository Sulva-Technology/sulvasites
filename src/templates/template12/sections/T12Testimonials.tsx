"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconQuote, IconStar } from "../icons";

/**
 * Customer words on square cards with a thick orange top edge and a decorative star row
 * (purely ornamental — testimonials carry no rating, so none is announced or implied).
 */
export default function T12Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "What customers say");
  // Editor: the real items untouched (one blank card when empty). Visitors: quoted items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());

  return (
    <section className="t12-section t12-tint t12-reviews-section">
      <div className="t12-container">
        <header className="t12-head t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" /> Reviews
          </p>
          <EditableText as="h2" className="t12-h2" value={title} placeholder="What customers say" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t12-reviews" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t12-review t12-reveal">
              <div className="t12-review-top" aria-hidden="true">
                <span className="t12-stars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <IconStar key={i} size={16} />
                  ))}
                </span>
                <span className="t12-review-mark">
                  <IconQuote size={30} />
                </span>
              </div>
              <EditableText
                as="blockquote"
                className="t12-review-quote"
                value={t.quote ?? ""}
                placeholder="What a customer said about the job."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t12-review-cite">
                  {t.name || enabled ? (
                    <EditableText
                      as="span"
                      className="t12-review-name"
                      value={t.name ?? ""}
                      placeholder="Name"
                      onCommit={(next) => setItem("items", items, idx, { name: next })}
                    />
                  ) : null}
                  {t.role || t.company || enabled ? (
                    <span className="t12-review-role">
                      <EditableText
                        as="span"
                        value={t.role ?? ""}
                        placeholder="Job / area"
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
