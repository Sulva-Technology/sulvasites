"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { toRoman, useSectionEditor } from "@/templates/shared/edit";
import { KITCHEN_ICONS, Ornament } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const FALLBACK = [
  { title: "Cooked from scratch", desc: "Describe how your kitchen works — sauces, breads, stocks." },
  { title: "Sourced with care", desc: "Where your ingredients come from and why it matters." },
  { title: "Made to share", desc: "How you want guests to feel at your table." },
];

/** Values as "Our kitchen" principles on a dark band, each with a small line icon. */
export default function T7Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Placeholders only while editing; visitors see real principles only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section className="t7-section t7-dark t7-kitchen">
      <div className="t7-container">
        <header className="t7-head t7-head-center t7-reveal">
          <span className="t7-rule-label">
            <i aria-hidden="true" />
            <span>Principles</span>
            <i aria-hidden="true" />
          </span>
          <h2 className="t7-h2">Our kitchen</h2>
        </header>

        <div className="t7-principles" data-count={Math.min(items.length, 4)}>
          {items.map((v, idx) => {
            const Icon = KITCHEN_ICONS[idx % KITCHEN_ICONS.length];
            return (
              <article key={idx} className="t7-principle t7-reveal">
                <span className="t7-principle-ico">
                  <Icon size={26} />
                </span>
                <span className="t7-principle-num">
                  <Ornament size={8} /> {toRoman(idx + 1)}
                </span>
                <EditableText
                  as="h3"
                  className="t7-h3"
                  value={v.title}
                  placeholder={FALLBACK[idx % FALLBACK.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <EditableText
                  as="p"
                  value={v.desc}
                  placeholder={FALLBACK[idx % FALLBACK.length].desc}
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
