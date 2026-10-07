"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** Series, books, talks or ways to work together: bordered cards with an arrow link. */
export default function T17UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "", linkText: "", linkHref: "" }]
    : (section.items ?? []).filter((it) => it.title?.trim());
  if (items.length === 0) return null;
  return (
    <section className="t17-section">
      <div className="t17-container">
        <header className="t17-section-head t17-reveal">
          <EditableText as="h2" className="t17-h2" value={section.title || (enabled ? "" : "Series & projects")} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          {section.description || enabled ? (
            <EditableText as="p" className="t17-lead" value={section.description || ""} placeholder="A line of introduction" multiline onCommit={(next) => set({ description: next })} />
          ) : null}
        </header>
        <div className="t17-cards">
          {items.map((it, i) => (
            <article key={i} className="t17-card t17-reveal">
              <EditableText as="h3" className="t17-h3" value={it.title ?? ""} placeholder="Title" onCommit={(next) => setItem("items", items, i, { title: next })} />
              <EditableText as="p" className="t17-body" value={it.description ?? ""} placeholder="Description" multiline onCommit={(next) => setItem("items", items, i, { description: next })} />
              {it.linkText || enabled ? (
                <a className="t17-link-arrow" href={it.linkHref || "#"}>
                  <EditableText as="span" value={it.linkText ?? ""} placeholder="Link text" onCommit={(next) => setItem("items", items, i, { linkText: next })} />
                  <IconArrow size={16} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
