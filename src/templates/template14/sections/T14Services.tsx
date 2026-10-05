"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Service name", desc: "What it includes and who it is for." },
  { title: "Another service", desc: "Keep it short and specific." },
  { title: "Third service", desc: "One or two short sentences." },
];

/** Services as an editorial list: a hairline row per service with a numeral, title and description. */
export default function T14Services({
  section,
  sectionIndex,
  anchor,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank row when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "services" : undefined} className="t14-section t14-services-section">
      <div className="t14-container t14-split">
        <header className="t14-head t14-reveal">
          <p className="t14-label">Services</p>
          <h2 className="t14-h2">How we can help</h2>
        </header>
        <ul className="t14-services">
          {items.map((it, idx) => (
            <li key={idx} className="t14-service t14-reveal">
              <span className="t14-service-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <div>
                <EditableText
                  as="h3"
                  className="t14-service-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t14-muted"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
