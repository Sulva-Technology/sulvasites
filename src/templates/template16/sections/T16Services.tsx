"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { joinHref, useT16 } from "../ctx";
import { IconArrow, ServiceIcon } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Department or programme", desc: "Health & wellness, prayer, outreach — what it does and for whom." },
  { title: "Another one", desc: "Content, design, mentorship or volunteering — keep it specific." },
  { title: "Third one", desc: "One or two short sentences." },
];

/** Departments / programmes as centred cards: an icon tile picked from the title, title, description, "Get involved". */
export default function T16Services({
  section,
  sectionIndex,
  anchor,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const ctx = useT16();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "departments" : undefined} className="t16-section t16-tinted">
      <div className="t16-container">
        <header className="t16-center-head t16-reveal">
          <p className="t16-kicker">Departments</p>
          <h2 className="t16-h2">Ways to serve and grow</h2>
          <p className="t16-head-note">Teams and programmes that care for the whole person and the whole community.</p>
        </header>

        <ul className="t16-depts" data-count={items.length}>
          {items.map((it, idx) => {
            const t = it.title?.trim() ?? "";
            return (
              <li key={idx} className="t16-dept t16-card t16-reveal">
                <span className="t16-ico-tile t16-ico-lg" aria-hidden="true">
                  <ServiceIcon title={t} />
                </span>
                <EditableText
                  as="h3"
                  className="t16-h3"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t16-muted t16-small"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <a className="t16-textlink" href={joinHref(ctx)} aria-label={`Get involved with ${t || "this department"}`}>
                  Get involved <IconArrow size={15} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
