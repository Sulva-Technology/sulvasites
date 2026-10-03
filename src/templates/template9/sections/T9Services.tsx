"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { joinHref, useT9 } from "../ctx";
import { IconArrow } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Class name", desc: "What the session involves and who it suits." },
  { title: "Another class", desc: "Intensity, equipment, how long it runs." },
  { title: "Third class", desc: "Keep it short and punchy." },
];

/** Classes as a timetable board: numbered rows with title, description and a "Book class" button. */
export default function T9Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const ctx = useT9();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank row when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section id="classes" className="t9-section t9-classes-section">
      <div className="t9-container">
        <header className="t9-head t9-head-split t9-reveal">
          <div>
            <span className="t9-kicker t9-kicker-dark">Timetable</span>
            <h2 className="t9-h2">
              Find your <em>class</em>
            </h2>
          </div>
          <p className="t9-head-note">
            {items.length} {items.length === 1 ? "class" : "classes"} · pick one and book your spot
          </p>
        </header>

        <ol className="t9-timetable">
          {items.map((it, idx) => (
            <li key={idx} className="t9-class t9-reveal">
              <span className="t9-class-no" aria-hidden="true">
                {pad2(idx + 1)}
              </span>
              <div className="t9-class-body">
                <EditableText
                  as="h3"
                  className="t9-class-title"
                  value={it.title}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t9-class-desc"
                    value={it.desc}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
              </div>
              <a className="t9-btn t9-btn-sm t9-class-book" href={joinHref(ctx, it.title)} aria-label={`Book class: ${it.title || "class"}`}>
                Book class <IconArrow size={16} />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
