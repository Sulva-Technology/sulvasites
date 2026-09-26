"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";

const FALLBACK = [
  { title: "Sign up", desc: "Create your account in under a minute." },
  { title: "Set it up", desc: "Choose what you need — sensible defaults do the rest." },
  { title: "Invite others", desc: "Bring your team or customers along." },
  { title: "Relax", desc: "Everything runs on schedule from here." },
];

/** Values as "How it works" numbered steps on a dark band. */
export default function T4Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section className="t4-section t4-dark">
      <div className="t4-container">
        <div className="t4-head t4-center t4-reveal">
          <span className="t4-label">How it works</span>
          <h2 className="t4-h2">Up and running in {items.length} steps</h2>
        </div>
        <div className="t4-steps">
          {items.map((v, idx) => (
            <div key={idx} className="t4-step t4-reveal">
              <span className="t4-step-num">{pad2(idx + 1)}</span>
              <EditableText as="h3" className="t4-h3" value={v.title} placeholder="Step" onCommit={(next) => setItem("items", items, idx, { title: next })} />
              <EditableText
                as="p"
                className="t4-muted"
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
