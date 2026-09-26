"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { useT1 } from "../ctx";
import { IconArrow } from "../icons";

const FALLBACK = [
  { title: "Senior-led", desc: "Experienced people do the work — not just the pitch." },
  { title: "Evidence-based", desc: "Recommendations grounded in data and real-world results." },
  { title: "Transparent", desc: "Clear scope, clear fees and regular progress updates." },
  { title: "Practical", desc: "Advice you can actually implement with the team you have." },
];

/** "Why choose us": dark sticky panel + 2×2 grid of values. */
export default function T1Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { baseUrl, profile } = useT1();
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section className="t1-section t1-grey">
      <div className="t1-container t1-why">
        <div className="t1-why-panel t1-reveal">
          <span className="t1-over" style={{ color: "inherit" }}>
            Why {profile.business_name}
          </span>
          <h2 className="t1-h2">A partner you can rely on</h2>
          <p className="t1-lead">We measure success by the outcomes we deliver for our clients — and the relationships that last.</p>
          <div>
            <a className="t1-btn t1-btn-white" href={`${baseUrl}/about`}>
              About us <IconArrow />
            </a>
          </div>
        </div>
        <div className="t1-why-grid">
          {items.map((v, idx) => (
            <div key={idx} className="t1-why-item t1-reveal">
              <span className="t1-why-num">{pad2(idx + 1)}</span>
              <EditableText as="h3" className="t1-h3" value={v.title} placeholder="Value" onCommit={(next) => setItem("items", items, idx, { title: next })} />
              <EditableText
                as="p"
                className="t1-muted"
                value={v.desc}
                placeholder="Description"
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
