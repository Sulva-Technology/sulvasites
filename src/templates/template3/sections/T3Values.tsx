"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { toRoman, useSectionEditor } from "../edit";
import { T3Index } from "../ui";

const FALLBACK = [
  { title: "Think long term", desc: "Every decision should still make sense years from now." },
  { title: "Craft over speed", desc: "Details are where trust is earned — so we sweat them." },
  { title: "Honest partnership", desc: "Clear expectations, straight answers, no surprises." },
];

/** Values on a dark band with roman numerals. */
export default function T3Values({
  section,
  sectionIndex,
  n,
}: {
  section: ValuesSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section className="t3-section t3-band">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Principles" />
          <h2 className="t3-title">
            How I <em style={{ color: "inherit" }}>work</em>
          </h2>
        </div>

        <div className="t3-values">
          {items.map((v, idx) => (
            <div key={idx} className="t3-value t3-reveal">
              <div className="t3-value-num">{toRoman(idx + 1)}.</div>
              <EditableText
                as="h3"
                value={v.title}
                placeholder="Value title"
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              <EditableText
                as="p"
                className="t3-muted"
                value={v.desc}
                placeholder="Value description"
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
