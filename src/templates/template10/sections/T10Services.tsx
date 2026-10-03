"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { applyHref, useT10 } from "../ctx";
import { IconArrow, Scribble, SUBJECT_ICONS } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Programme name", desc: "Who it's for, what learners study and how it runs." },
  { title: "Another programme", desc: "Ages or level, class size, schedule." },
  { title: "Third programme", desc: "Keep it short and friendly." },
];

const TONES = ["blue", "sun", "navy"] as const;

/** Programmes as rounded cards: subject icon, level chip (from order), title, description and "Enquire". */
export default function T10Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const ctx = useT10();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section id="programmes" className="t10-section t10-programmes-section">
      <div className="t10-container">
        <header className="t10-head t10-head-split t10-reveal">
          <div>
            <span className="t10-kicker">Programmes</span>
            <h2 className="t10-h2">
              Find the right{" "}
              <span className="t10-hl">
                programme
                <Scribble className="t10-scribble" />
              </span>
            </h2>
          </div>
          <p className="t10-head-note">Pick a programme to enquire about it, or ask us to help you choose the right fit.</p>
        </header>

        <div className="t10-programmes" data-count={items.length}>
          {items.map((it, idx) => {
            const Icon = SUBJECT_ICONS[idx % SUBJECT_ICONS.length];
            const tone = TONES[idx % TONES.length];
            return (
              <article key={idx} className="t10-programme t10-reveal" data-tone={tone}>
                <div className="t10-programme-top">
                  <span className="t10-programme-ico" aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <span className={`t10-chip t10-chip-${tone}`}>Level {idx + 1}</span>
                </div>
                <EditableText
                  as="h3"
                  className="t10-programme-title"
                  value={it.title}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t10-programme-desc"
                    value={it.desc}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <a
                  className="t10-textlink t10-programme-link"
                  href={applyHref(ctx, { service: it.title })}
                  aria-label={`Enquire about ${it.title || "this programme"}`}
                >
                  Enquire <IconArrow size={16} />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
