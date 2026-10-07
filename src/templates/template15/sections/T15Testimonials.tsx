"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconQuote } from "../icons";

/** Buyer stories on glass cards: an accent quote mark, the quote and an initials avatar with name and role. */
export default function T15Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "From our owners");
  // Editor: the real items untouched (one blank card when empty). Visitors: quoted items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());

  return (
    <section className="t15-section t15-reviews-section">
      <div className="t15-container">
        <header className="t15-head t15-reveal">
          <p className="t15-eyebrow">Reviews</p>
          <EditableText as="h2" className="t15-h2" value={title} placeholder="From our owners" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t15-reviews" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t15-review t15-glass t15-reveal">
              <span className="t15-review-mark" aria-hidden="true">
                <IconQuote size={30} />
              </span>
              <EditableText
                as="blockquote"
                className="t15-review-quote"
                value={t.quote ?? ""}
                placeholder="What an owner said about buying or servicing with you."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t15-review-cite">
                  <span className="t15-avatar" aria-hidden="true">
                    {initials(t.name ?? "")}
                  </span>
                  <span>
                    {t.name || enabled ? (
                      <EditableText
                        as="span"
                        className="t15-review-name"
                        value={t.name ?? ""}
                        placeholder="Name"
                        onCommit={(next) => setItem("items", items, idx, { name: next })}
                      />
                    ) : null}
                    {t.role || t.company || enabled ? (
                      <span className="t15-review-role">
                        <EditableText
                          as="span"
                          value={t.role ?? ""}
                          placeholder="Car bought / service"
                          onCommit={(next) => setItem("items", items, idx, { role: next })}
                        />
                        {t.company ? `${t.role ? ", " : ""}${t.company}` : null}
                      </span>
                    ) : null}
                  </span>
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
