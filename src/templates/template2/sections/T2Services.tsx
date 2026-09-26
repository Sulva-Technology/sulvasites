"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { title: "Editorial design", desc: "Magazines, books and reports with a strong point of view." },
  { title: "Brand stories", desc: "Campaigns and content that people actually want to read." },
  { title: "Photography", desc: "Art-directed shoots for people, places and products." },
];

/** Services as newspaper columns with big red numerals. */
export default function T2Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section id="services" className="t2-section">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Departments</span>
            <h2 className="t2-title">
              What we <em>make</em>
            </h2>
          </div>
          <span className="t2-meta">{items.length} disciplines</span>
        </div>
        <div className="t2-cols">
          {items.map((s, idx) => (
            <article key={idx} className="t2-col t2-reveal">
              <span className="t2-col-num">{idx + 1}</span>
              <EditableText as="h3" className="t2-h3" value={s.title} placeholder="Service" onCommit={(next) => setItem("items", items, idx, { title: next })} />
              <EditableText
                as="p"
                className="t2-muted"
                value={s.desc}
                placeholder="Description"
                multiline
                onCommit={(next) => setItem("items", items, idx, { desc: next })}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
