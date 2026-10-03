"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { Ornament } from "../icons";

const FALLBACK_QUOTE = "Add a few words from a guest — what they ate, and why they came back.";

/** Guest words as editorial pull quotes: one large lead quote, the rest in a ruled grid. */
export default function T7Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || "From our guests";
  const source = enabled ? section.items : section.items?.filter((t) => t.quote?.trim());
  const items = (source?.length ? source : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "",
    role: t.role || "",
    quote: t.quote || "",
    company: t.company || "",
  }));

  const cite = (t: (typeof items)[number], idx: number) => (
    <figcaption className="t7-cite">
      {t.name || enabled ? (
        <EditableText
          as="span"
          className="t7-cite-name"
          value={t.name}
          placeholder="Name"
          onCommit={(next) => setItem("items", items, idx, { name: next })}
        />
      ) : null}
      {t.role || t.company || enabled ? (
        <span className="t7-cite-role">
          <EditableText
            as="span"
            value={t.role}
            placeholder="Role"
            onCommit={(next) => setItem("items", items, idx, { role: next })}
          />
          {t.company ? `${t.role ? ", " : ""}${t.company}` : null}
        </span>
      ) : null}
    </figcaption>
  );

  const [lead, ...rest] = items;

  return (
    <section className="t7-section t7-quotes-section">
      <div className="t7-container">
        <header className="t7-head t7-head-center t7-reveal">
          <span className="t7-rule-label">
            <i aria-hidden="true" />
            <EditableText as="span" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
            <i aria-hidden="true" />
          </span>
        </header>

        <figure className="t7-pull t7-reveal">
          <span className="t7-pull-mark" aria-hidden="true">
            &ldquo;
          </span>
          <EditableText
            as="blockquote"
            value={lead.quote}
            placeholder={FALLBACK_QUOTE}
            multiline
            onCommit={(next) => setItem("items", items, 0, { quote: next })}
          />
          {cite(lead, 0)}
        </figure>

        {rest.length ? (
          <div className="t7-quotes" data-count={Math.min(rest.length, 3)}>
            {rest.map((t, i) => (
              <figure key={i + 1} className="t7-quote t7-reveal">
                <Ornament size={10} />
                <EditableText
                  as="blockquote"
                  value={t.quote}
                  placeholder={FALLBACK_QUOTE}
                  multiline
                  onCommit={(next) => setItem("items", items, i + 1, { quote: next })}
                />
                {cite(t, i + 1)}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
