"use client";

import { useRef } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow, IconArrowLeft, IconStar } from "../icons";

const FALLBACK_QUOTE =
  "From the first viewing to getting our keys, everything was clear and on time. We never felt rushed or left guessing.";

/** Scroll-snap row of review cards with prev/next controls. */
export default function T6Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { set, setItem } = useSectionEditor(section, sectionIndex);
  const rowRef = useRef<HTMLDivElement>(null);
  const title = section.title || "What our clients say";
  const items = (section.items?.length ? section.items : [{ name: "", role: "", quote: "" }]).map((t) => ({
    name: t.name || "Client name",
    role: t.role || "Homeowner",
    quote: t.quote || FALLBACK_QUOTE,
    company: t.company || "",
  }));

  const scrollBy = (dir: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>(".t6-review");
    row.scrollBy({ left: dir * ((card?.offsetWidth ?? 320) + 20), behavior: "smooth" });
  };

  return (
    <section className="t6-section">
      <div className="t6-container">
        <div className="t6-head t6-reveal">
          <div>
            <span className="t6-kicker">Reviews</span>
            <EditableText as="h2" className="t6-h2" value={title} placeholder="Reviews title" onCommit={(next) => set({ title: next })} />
          </div>
          {items.length > 3 ? (
            <div className="t6-reviews-nav">
              <button type="button" className="t6-round" aria-label="Previous reviews" onClick={() => scrollBy(-1)}>
                <IconArrowLeft />
              </button>
              <button type="button" className="t6-round" aria-label="Next reviews" onClick={() => scrollBy(1)}>
                <IconArrow />
              </button>
            </div>
          ) : null}
        </div>

        <div className="t6-reviews t6-reveal" ref={rowRef}>
          {items.map((t, idx) => (
            <figure key={idx} className="t6-review" style={{ margin: 0 }}>
              <div className="t6-stars" aria-label="5 out of 5">
                {Array.from({ length: 5 }, (_, i) => (
                  <IconStar key={i} />
                ))}
              </div>
              <EditableText
                as="blockquote"
                value={t.quote}
                placeholder="Quote"
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              <figcaption className="t6-person">
                <span className="t6-avatar" aria-hidden="true">
                  {initials(t.name)}
                </span>
                <span>
                  <EditableText
                    as="div"
                    value={t.name}
                    placeholder="Name"
                    style={{ fontWeight: 600 }}
                    onCommit={(next) => setItem("items", items, idx, { name: next })}
                  />
                  <div className="t6-muted" style={{ fontSize: 14 }}>
                    <EditableText
                      as="span"
                      value={t.role}
                      placeholder="Role"
                      onCommit={(next) => setItem("items", items, idx, { role: next })}
                    />
                    {t.company ? `, ${t.company}` : null}
                  </div>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
