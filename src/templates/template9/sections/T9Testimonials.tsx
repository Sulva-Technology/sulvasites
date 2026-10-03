"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

/**
 * Member results on a black slanted band: each quote is set big beside an oversized red
 * outline number; the first quote leads at display size.
 */
export default function T9Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || "Real results";
  const source = enabled ? section.items : section.items?.filter((t) => t.quote?.trim());
  const items = (source?.length ? source : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "",
    role: t.role || "",
    quote: t.quote || "",
    company: t.company || "",
  }));

  return (
    <section className="t9-section t9-band t9-results-section">
      <div className="t9-container">
        <header className="t9-head t9-head-split t9-reveal">
          <div>
            <span className="t9-kicker">Member stories</span>
            <EditableText as="h2" className="t9-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          </div>
        </header>

        <div className="t9-results" data-count={Math.min(items.length, 4)} data-rest-odd={(items.length - 1) % 2 === 1}>
          {items.map((t, idx) => (
            <figure key={idx} className="t9-result t9-reveal" data-lead={idx === 0}>
              <span className="t9-result-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <div className="t9-result-body">
                <EditableText
                  as="blockquote"
                  className="t9-result-quote"
                  value={t.quote}
                  placeholder="A member's words — what changed for them since they started."
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { quote: next })}
                />
                {t.name || t.role || t.company || enabled ? (
                  <figcaption className="t9-result-cite">
                    {t.name || enabled ? (
                      <EditableText
                        as="span"
                        className="t9-result-name"
                        value={t.name}
                        placeholder="Name"
                        onCommit={(next) => setItem("items", items, idx, { name: next })}
                      />
                    ) : null}
                    {t.role || t.company || enabled ? (
                      <span className="t9-result-role">
                        <EditableText
                          as="span"
                          value={t.role}
                          placeholder="Role / member since"
                          onCommit={(next) => setItem("items", items, idx, { role: next })}
                        />
                        {t.company ? `${t.role ? ", " : ""}${t.company}` : null}
                      </span>
                    ) : null}
                  </figcaption>
                ) : null}
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
