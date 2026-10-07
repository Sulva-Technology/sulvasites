"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { enquireHref, useT15 } from "../ctx";
import { IconArrow, ServiceIcon } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Service name", desc: "Sales, sourcing, restoration — what you do and for whom." },
  { title: "Another service", desc: "Servicing, detailing, storage or finance — keep it specific." },
  { title: "Third service", desc: "One or two short sentences." },
];

/** Services as glass cards: an icon picked from the title, the title, description and an "Enquire" link. */
export default function T15Services({
  section,
  sectionIndex,
  anchor,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const ctx = useT15();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "services" : undefined} className="t15-section t15-services-section">
      <div className="t15-container">
        <header className="t15-head t15-reveal">
          <p className="t15-eyebrow">Services</p>
          <h2 className="t15-h2">Everything your car needs</h2>
        </header>

        <ul className="t15-services" data-count={items.length}>
          {items.map((it, idx) => {
            const t = it.title?.trim() ?? "";
            return (
              <li key={idx} className="t15-service t15-glass t15-reveal">
                <span className="t15-service-ico" aria-hidden="true">
                  <ServiceIcon title={t} />
                </span>
                <EditableText
                  as="h3"
                  className="t15-service-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t15-muted"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <a className="t15-textlink" href={enquireHref(ctx)} aria-label={`Enquire about ${t || "this service"}`}>
                  Enquire <IconArrow size={15} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
