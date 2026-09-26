"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK_QUOTE = "They didn't just make it look good — they made it mean something.";

/** Pull quotes: the first spans the full width, the rest sit in columns. */
export default function T2Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "In their words";
  const items = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Client name",
    role: t.role || "Client",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));

  return (
    <section className="t2-section t2-section-rule">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Letters</span>
            <EditableText as="h2" className="t2-title" value={title} placeholder="Title" onCommit={(next) => set({ title: next })} />
          </div>
        </div>
        <div className="t2-quotes">
          {items.map((t, idx) => (
            <figure key={idx} className="t2-quote t2-reveal">
              <EditableText as="blockquote" value={t.quote} placeholder="Quote" multiline onCommit={(next) => setItem("items", items, idx, { quote: next })} />
              <figcaption>
                <EditableText as="span" value={t.name} placeholder="Name" style={{ color: "inherit" }} onCommit={(next) => setItem("items", items, idx, { name: next })} />
                {" — "}
                <span>
                  <EditableText as="span" value={t.role} placeholder="Role" onCommit={(next) => setItem("items", items, idx, { role: next })} />
                  {t.company ? `, ${t.company}` : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
