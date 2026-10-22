"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { toRoman, useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { title: "Consult", desc: "We talk through your style, skin and the occasion so nothing is left to guesswork." },
  { title: "Create", desc: "Skin prep first, then a look built to photograph beautifully and last all day." },
  { title: "Glow", desc: "Leave feeling confident, with tips and a touch-up plan for the hours ahead." },
];

/** Values as "the experience": three circled steps. */
export default function T5Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK.map(() => ({}) as Partial<(typeof section.items)[number]>)).map((it) => ({
    title: it.title || "",
    desc: it.desc || "",
  }));

  return (
    <section className="t5-section">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">The experience</span>
          <h2 className="t5-title">
            Designed around <em>you</em>
          </h2>
        </div>
        <div className="t5-steps">
          {items.map((v, idx) => (
            <div key={idx} className="t5-step t5-reveal">
              <span className="t5-step-num">{toRoman(idx + 1)}</span>
              <EditableText as="h3" className="t5-h3" value={v.title} placeholder={FALLBACK[idx % FALLBACK.length].title} onCommit={(next) => setItem("items", items, idx, { title: next })} />
              <EditableText
                as="p"
                className="t5-muted"
                value={v.desc}
                placeholder={FALLBACK[idx % FALLBACK.length].desc}
                multiline
                onCommit={(next) => setItem("items", items, idx, { desc: next })}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
