"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconQuote } from "../icons";

const FALLBACK_QUOTE = "Add a few words from a patient — how they felt and what made the visit easy.";

/** Patient stories as soft cards on a mint band, each with an initials avatar. */
export default function T8Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || "What our patients say";
  const source = enabled ? section.items : section.items?.filter((t) => t.quote?.trim());
  const items = (source?.length ? source : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || (enabled ? "Patient name" : ""),
    role: t.role || "",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));

  return (
    <section className="t8-section t8-tint t8-stories-section">
      <div className="t8-container">
        <header className="t8-head t8-head-center t8-reveal">
          <span className="t8-eyebrow">Patient stories</span>
          <EditableText as="h2" className="t8-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t8-stories" data-count={Math.min(items.length, 3)}>
          {items.map((t, idx) => (
            <figure key={idx} className="t8-story t8-reveal">
              <span className="t8-story-mark">
                <IconQuote size={26} />
              </span>
              <EditableText
                as="blockquote"
                value={t.quote}
                placeholder="Quote"
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t8-story-cite">
                  {t.name ? (
                    <span className="t8-avatar" aria-hidden="true">
                      {initials(t.name)}
                    </span>
                  ) : null}
                  <span>
                    {t.name || enabled ? (
                      <EditableText
                        as="span"
                        className="t8-story-name"
                        value={t.name}
                        placeholder="Name"
                        onCommit={(next) => setItem("items", items, idx, { name: next })}
                      />
                    ) : null}
                    {t.role || t.company || enabled ? (
                      <span className="t8-story-role">
                        <EditableText
                          as="span"
                          value={t.role}
                          placeholder="Role"
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
