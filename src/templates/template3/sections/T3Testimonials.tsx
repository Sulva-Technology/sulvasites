"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "../edit";
import { T3Index } from "../ui";

type Item = { name: string; role: string; quote: string; company: string };

const FALLBACK_QUOTE =
  "Working together felt effortless — clear thinking, careful execution, and a result we are genuinely proud of.";

/** First testimonial as a large pull quote; the rest in a ruled grid. */
export default function T3Testimonials({
  section,
  sectionIndex,
  n,
}: {
  section: TestimonialsSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Kind words";
  const items: Item[] = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Client name",
    role: t.role || "Client",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));
  const [featured, ...rest] = items;

  const cite = (t: Item, idx: number) => (
    <div className="t3-cite">
      <span className="t3-avatar" aria-hidden="true">
        {initials(t.name)}
      </span>
      <span>
        <EditableText
          as="span"
          value={t.name}
          placeholder="Name"
          style={{ fontWeight: 700, display: "block" }}
          onCommit={(next) => setItem("items", items, idx, { name: next })}
        />
        <span className="t3-muted">
          <EditableText
            as="span"
            value={t.role}
            placeholder="Role"
            onCommit={(next) => setItem("items", items, idx, { role: next })}
          />
          {t.company ? (
            <>
              {", "}
              <EditableText
                as="span"
                value={t.company}
                placeholder="Company"
                onCommit={(next) => setItem("items", items, idx, { company: next })}
              />
            </>
          ) : null}
        </span>
      </span>
    </div>
  );

  return (
    <section className="t3-section">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Testimonials" />
          <EditableText
            as="h2"
            className="t3-title"
            value={title}
            placeholder="Testimonials title"
            onCommit={(next) => set({ title: next })}
          />
        </div>

        <figure className="t3-quote-feature t3-reveal" style={{ margin: 0 }}>
          <span className="t3-quote-mark" aria-hidden="true">
            “
          </span>
          <EditableText
            as="blockquote"
            value={featured.quote}
            placeholder="Quote"
            multiline
            onCommit={(next) => setItem("items", items, 0, { quote: next })}
          />
          {cite(featured, 0)}
        </figure>

        {rest.length ? (
          <div className="t3-quotes">
            {rest.map((t, i) => (
              <figure key={i} className="t3-quote t3-reveal" style={{ margin: 0 }}>
                <EditableText
                  as="p"
                  value={t.quote}
                  placeholder="Quote"
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
