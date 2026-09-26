"use client";

import { useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { useT4 } from "../ctx";
import { IconArrow } from "../icons";

const FALLBACK: UseCasesSection["items"] = [
  { title: "For busy individuals", description: "Plan once and let the app handle the rest — reminders, updates and everything in between." },
  { title: "For growing teams", description: "Shared workspaces, roles and clear ownership so nothing slips through the cracks." },
  { title: "For partners", description: "Tools and dashboards that make working with you effortless." },
];

/** Use cases as tabs: list on the left, detail panel on the right. */
export default function T4UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { baseUrl } = useT4();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [active, setActive] = useState(0);
  const title = section.title || "Made for everyone involved";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));
  const idx = Math.min(active, items.length - 1);
  const current = items[idx];

  return (
    <section className="t4-section t4-soft-bg">
      <div className="t4-container">
        <div className="t4-head t4-reveal">
          <span className="t4-label">Use cases</span>
          <EditableText as="h2" className="t4-h2" value={title} placeholder="Section title" style={{ marginTop: 12 }} onCommit={(next) => set({ title: next })} />
          {description || enabled ? (
            <EditableText
              as="p"
              className="t4-lead"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              style={{ marginTop: 14 }}
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </div>

        <div className="t4-tabs t4-reveal">
          <div className="t4-tablist" role="tablist" aria-label={title}>
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className="t4-tab"
                aria-selected={i === idx}
                onClick={() => setActive(i)}
              >
                <span className="t4-tab-num">{pad2(i + 1)}</span>
                <EditableText
                  as="h3"
                  className="t4-h3"
                  value={it.title}
                  placeholder="Use case"
                  onCommit={(next) => setItem("items", items, i, { title: next })}
                />
              </button>
            ))}
          </div>

          <div className="t4-panel" role="tabpanel">
            <div className="t4-panel-body" key={idx}>
              <span className="t4-label" style={{ color: "inherit", opacity: 0.6 }}>
                {pad2(idx + 1)} / {pad2(items.length)}
              </span>
              <h3 className="t4-h3">{current.title}</h3>
              <EditableText
                as="p"
                className="t4-muted"
                value={current.description}
                placeholder="Description"
                multiline
                onCommit={(next) => setItem("items", items, idx, { description: next })}
              />
            </div>
            <a className="t4-textlink" href={current.linkHref || `${baseUrl}/contact`}>
              <EditableText
                as="span"
                value={current.linkText || "Talk to us"}
                placeholder="Link text"
                onCommit={(next) => setItem("items", items, idx, { linkText: next })}
              />
              <IconArrow size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
