"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { title: "Say something.", desc: "Work without a point of view is just decoration." },
  { title: "Make it by hand.", desc: "Craft shows. We sweat the details nobody asked for." },
  { title: "Tell the truth.", desc: "Honest stories travel further than clever ones." },
];

/** Values as a big numbered manifesto on black. */
export default function T2Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section className="t2-section t2-dark">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Manifesto</span>
            <h2 className="t2-title">What we believe</h2>
          </div>
        </div>
        <div className="t2-manifesto">
          {items.map((v, idx) => (
            <div key={idx} className="t2-point t2-reveal">
              <span className="t2-point-num">No. {pad2(idx + 1)}</span>
              <EditableText as="h3" className="t2-h3" value={v.title} placeholder="Statement" onCommit={(next) => setItem("items", items, idx, { title: next })} />
              <EditableText
                as="p"
                className="t2-muted"
                value={v.desc}
                placeholder="Explanation"
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
