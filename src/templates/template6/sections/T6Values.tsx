"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { useT6 } from "../ctx";
import { IconArrow } from "../icons";

const FALLBACK = [
  { title: "Location first", desc: "We focus on areas with delivered roads, power and water — not promises." },
  { title: "Documents checked", desc: "Title and approvals are verified before a property is ever listed." },
  { title: "Inspect before you commit", desc: "Every property can be visited, with specifications documented." },
  { title: "Terms in writing", desc: "Prices and payment plans agreed clearly before you pay a deposit." },
];

/** Values shown as a numbered process on a dark band. */
export default function T6Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { baseUrl } = useT6();
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section className="t6-section t6-dark">
      <div className="t6-container t6-process">
        <div className="t6-process-head t6-reveal">
          <span className="t6-kicker">Why work with us</span>
          <h2 className="t6-h2">What we check before you commit</h2>
          <p className="t6-lead">
            Property rewards diligence over speed. Here is how we protect every client on every deal.
          </p>
          <div>
            <a className="t6-btn t6-btn-light" href={`${baseUrl}/contact`}>
              Speak to an advisor <IconArrow />
            </a>
          </div>
        </div>

        <div className="t6-steps">
          {items.map((v, idx) => (
            <div key={idx} className="t6-step t6-reveal">
              <span className="t6-step-num">{pad2(idx + 1)}</span>
              <div>
                <EditableText
                  as="h3"
                  className="t6-h3"
                  value={v.title}
                  placeholder="Step title"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <EditableText
                  as="p"
                  className="t6-muted"
                  value={v.desc}
                  placeholder="Step description"
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
