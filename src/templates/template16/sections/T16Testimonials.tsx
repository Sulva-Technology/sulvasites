"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconQuote, IconStar } from "../icons";

/** Member stories on rounded cards: five stars, an italic quote, initials avatar with name and role. Swipes on phones. */
export default function T16Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "Lives changed in the circle");
  // Editor: the real items untouched (one blank card when empty). Visitors: quoted items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());

  return (
    <section className="t16-section t16-stories-section">
      <div className="t16-container">
        <header className="t16-center-head t16-reveal">
          <p className="t16-kicker">Testimonials</p>
          <EditableText as="h2" className="t16-h2" value={title} placeholder="Lives changed in the circle" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t16-stories" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t16-story t16-card t16-reveal">
              <span className="t16-story-mark" aria-hidden="true">
                <IconQuote />
              </span>
              <span className="t16-stars" aria-label="5 out of 5">
                {Array.from({ length: 5 }, (_, i) => (
                  <IconStar key={i} />
                ))}
              </span>
              <EditableText
                as="blockquote"
                className="t16-story-quote"
                value={t.quote ?? ""}
                placeholder="What a member said about their time with you."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t16-story-cite">
                  <span className="t16-avatar" aria-hidden="true">
                    {initials(t.name ?? "")}
                  </span>
                  <span>
                    {t.name || enabled ? (
                      <EditableText
                        as="span"
                        className="t16-story-name"
                        value={t.name ?? ""}
                        placeholder="Name"
                        onCommit={(next) => setItem("items", items, idx, { name: next })}
                      />
                    ) : null}
                    {t.role || t.company || enabled ? (
                      <span className="t16-story-role">
                        <EditableText
                          as="span"
                          value={t.role ?? ""}
                          placeholder="Member since…"
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
