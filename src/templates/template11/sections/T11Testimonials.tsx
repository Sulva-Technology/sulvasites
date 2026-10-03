"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const TONES = ["peach", "lilac", "butter", "rose"] as const;

/** Guest & client words as sticky notes: pastel squares, washi tape and a gentle alternating tilt. */
export default function T11Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "Kind words");
  const source = enabled ? section.items : section.items?.filter((t) => t.quote?.trim());
  const items = (source?.length ? source : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "",
    role: t.role || "",
    quote: t.quote || "",
    company: t.company || "",
  }));

  return (
    <section className="t11-section t11-notes-section">
      <div className="t11-container">
        <header className="t11-head t11-head-center t11-reveal">
          <span className="t11-kicker">Guest book</span>
          <EditableText as="h2" className="t11-h2" value={title} placeholder="Kind words" onCommit={(next) => set({ title: next })} />
        </header>

        <div className="t11-notes" data-count={items.length}>
          {items.map((t, idx) => (
            <figure key={idx} className="t11-note t11-reveal" data-tone={TONES[idx % TONES.length]}>
              <span className="t11-note-tape" aria-hidden="true" />
              <EditableText
                as="blockquote"
                className="t11-note-quote"
                value={t.quote}
                placeholder="What a guest or client said about the day."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              {t.name || t.role || t.company || enabled ? (
                <figcaption className="t11-note-cite">
                  {t.name || enabled ? (
                    <EditableText
                      as="span"
                      className="t11-note-name"
                      value={t.name}
                      placeholder="Name"
                      onCommit={(next) => setItem("items", items, idx, { name: next })}
                    />
                  ) : null}
                  {t.role || t.company || enabled ? (
                    <span className="t11-note-role">
                      <EditableText
                        as="span"
                        value={t.role}
                        placeholder="Wedding / birthday / launch…"
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
