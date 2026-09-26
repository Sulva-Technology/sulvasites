"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "../edit";
import { T3ArrowIcon, T3Index } from "../ui";

const FALLBACK = [
  { title: "Brand strategy", desc: "Positioning, messaging and a clear story people remember." },
  { title: "Creative direction", desc: "A visual language that feels considered, consistent and yours." },
  { title: "Advisory", desc: "Hands-on guidance to turn plans into measurable progress." },
];

/** Services as a numbered index — one row per service. */
export default function T3Services({
  section,
  sectionIndex,
  n,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section id="services" className="t3-section">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Services" />
          <h2 className="t3-title">
            What I can <em>help</em> with
          </h2>
        </div>

        <div className="t3-index-list">
          {items.map((s, idx) => (
            <div key={idx} className="t3-index-row t3-reveal">
              <span className="t3-index">{pad2(idx + 1)}</span>
              <EditableText
                as="h3"
                value={s.title}
                placeholder="Service title"
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              <EditableText
                as="p"
                value={s.desc}
                placeholder="Service description"
                multiline
                onCommit={(next) => setItem("items", items, idx, { desc: next })}
              />
              <span className="t3-circle" aria-hidden="true">
                <T3ArrowIcon />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
