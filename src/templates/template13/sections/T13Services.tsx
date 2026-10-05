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

/** Services as a sticky split: fixed heading on the left, numbered dark cards on the right. */
export default function T13Services({
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
    <section id={anchor ? "services" : undefined} className="t13-section t13-services-section">
      <div className="t13-container t13-split-grid">
        <div>
          <div className="t13-sticky t13-reveal">
            <p className="t13-label">Services</p>
            <h2 className="t13-h2">What we make.</h2>
          </div>
        </div>
        <ol className="t13-svc-list">
          {items.map((it, idx) => (
            <li key={idx} className="t13-svc t13-reveal" style={{ ["--d" as string]: idx }}>
              <span className="t13-svc-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <div className="t13-svc-body">
                <EditableText
                  as="h3"
                  className="t13-svc-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t13-svc-desc"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
