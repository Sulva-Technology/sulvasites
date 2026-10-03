"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconQuote } from "../icons";

const TONES = ["blue", "paper", "sun"] as const;

/** Student & parent stories as rounded speech-bubble cards in blue, paper and sunflower. */
export default function T10Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "Stories from our learners");
  const source = enabled ? section.items : section.items?.filter((t) => t.quote?.trim());
  const items = (source?.length ? source : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "",
    role: t.role || "",
    quote: t.quote || "",
    company: t.company || "",
  }));

  return (
    <section className="t10-section t10-tint t10-stories-section">
      <div className="t10-container">
        <header className="t10-head t10-head-center t10-reveal">
          <span className="t10-kicker">Stories</span>
          <EditableText as="h2" className="t10-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t10-stories" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t10-story t10-reveal" data-tone={TONES[idx % TONES.length]}>
              <span className="t10-story-mark" aria-hidden="true">
                <IconQuote size={28} />
              </span>
              <EditableText
                as="blockquote"
                className="t10-story-quote"
                value={t.quote}
                placeholder="A student's or parent's words — what changed for them."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t10-story-cite">
                  <span className="t10-story-avatar" aria-hidden="true">
                    {initials(t.name.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, ""))}
                  </span>
                  <span>
                    {t.name || enabled ? (
                      <EditableText
                        as="span"
                        className="t10-story-name"
                        value={t.name}
                        placeholder="Name"
                        onCommit={(next) => setItem("items", items, idx, { name: next })}
                      />
                    ) : null}
                    {t.role || t.company || enabled ? (
                      <span className="t10-story-role">
                        <EditableText
                          as="span"
                          value={t.role}
                          placeholder="Parent / student / class of…"
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
