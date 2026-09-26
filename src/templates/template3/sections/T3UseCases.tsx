"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "../edit";
import { T3ArrowIcon, T3Index } from "../ui";

const FALLBACK: UseCasesSection["items"] = [
  { title: "A brand rebuilt from the ground up", description: "Describe the challenge, what you did, and the result it delivered." },
  { title: "Launching something new", description: "Share the goal, your approach, and the outcome in a few lines." },
];

/** Use cases presented as "Selected work": alternating cover + story rows. */
export default function T3UseCases({
  section,
  sectionIndex,
  n,
}: {
  section: UseCasesSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Selected work";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));

  return (
    <section id="work" className="t3-section">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Work" />
          <div>
            <EditableText
              as="h2"
              className="t3-title"
              value={title}
              placeholder="Section title"
              onCommit={(next) => set({ title: next })}
            />
            {description || enabled ? (
              <EditableText
                as="p"
                className="t3-lead"
                value={description}
                placeholder="Short intro (optional)"
                multiline
                style={{ marginTop: 20 }}
                onCommit={(next) => set({ description: next })}
              />
            ) : null}
          </div>
        </div>

        <div className="t3-work">
          {items.map((it, idx) => (
            <article key={idx} className="t3-work-item t3-reveal">
              <div className="t3-cover" aria-hidden="true">
                <span className="t3-cover-num">{pad2(idx + 1)}</span>
                <span className="t3-cover-title">{it.title}</span>
              </div>
              <div className="t3-work-body">
                <span className="t3-index">Project {pad2(idx + 1)}</span>
                <EditableText
                  as="h3"
                  value={it.title}
                  placeholder="Project title"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <EditableText
                  as="p"
                  value={it.description}
                  placeholder="Project description"
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { description: next })}
                />
                {it.linkHref || enabled ? (
                  <a className="t3-link" href={it.linkHref || "#contact"}>
                    <EditableText
                      as="span"
                      value={it.linkText || "View project"}
                      placeholder="Link text"
                      onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                    />
                    <span className="t3-arrow">
                      <T3ArrowIcon size={14} />
                    </span>
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
