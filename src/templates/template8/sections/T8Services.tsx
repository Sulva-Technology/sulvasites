"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { bookHref, useT8 } from "../ctx";
import { IconArrow, serviceIcon } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const FALLBACK = [
  { title: "Service name", desc: "A sentence about who it's for and what the visit involves." },
  { title: "Another service", desc: "What patients can expect, and how to prepare." },
  { title: "Third service", desc: "Keep it short and reassuring." },
];

/** Treatments as rounded icon cards; each card's link opens the booking form with that service preselected. */
export default function T8Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const ctx = useT8();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Placeholders only while editing; visitors see real services only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section id="services" className="t8-section t8-services-section">
      <div className="t8-container">
        <header className="t8-head t8-head-split t8-reveal">
          <div>
            <span className="t8-eyebrow">Treatments &amp; services</span>
            <h2 className="t8-h2">How we can help</h2>
          </div>
          <a className="t8-textlink" href={bookHref(ctx)}>
            Book an appointment <IconArrow size={16} />
          </a>
        </header>

        <div className="t8-services" data-count={Math.min(items.length, 4)}>
          {items.map((it, idx) => {
            const Icon = serviceIcon(it.title, idx);
            return (
              <article key={idx} className="t8-service t8-reveal">
                <span className="t8-service-ico">
                  <Icon size={26} />
                </span>
                <EditableText
                  as="h3"
                  className="t8-h3"
                  value={it.title}
                  placeholder={FALLBACK[idx % FALLBACK.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t8-muted"
                    value={it.desc}
                    placeholder={FALLBACK[idx % FALLBACK.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <a
                  className="t8-service-link"
                  href={bookHref(ctx, it.title)}
                  aria-label={`Book ${it.title}`}
                >
                  Book this <IconArrow size={16} />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
