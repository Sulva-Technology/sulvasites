"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { applyHref, useT10 } from "../ctx";
import { IconArrow } from "../icons";

/**
 * Use cases as "Pathways": numbered stops joined by a dashed route — a row on wide screens,
 * a vertical trail on phones — each with a title, description and link to the enquiry form.
 */
export default function T10UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT10();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Find your pathway");
  const description = section.description || "";
  const source = enabled ? section.items : section.items?.filter((it) => it.title?.trim());
  const items = (source?.length ? source : [{ title: "", description: "" }]).map((it) => ({
    ...it,
    title: it.title || "",
    description: it.description || "",
  }));

  return (
    <section className="t10-section t10-pathways-section">
      <div className="t10-container">
        <header className="t10-head t10-head-center t10-reveal">
          <span className="t10-kicker">Pathways</span>
          <EditableText as="h2" className="t10-h2" value={title} placeholder="Pathways title" onCommit={(next) => set({ title: next })} />
          {description || enabled ? (
            <EditableText
              as="p"
              className="t10-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <ol className="t10-pathways" data-cols={items.length <= 4 ? items.length : 3}>
          {items.map((it, idx) => (
            <li key={idx} className="t10-pathway t10-reveal">
              <span className="t10-pathway-stop" aria-hidden="true">
                {idx + 1}
              </span>
              <div className="t10-pathway-card">
                <EditableText
                  as="h3"
                  className="t10-pathway-title"
                  value={it.title}
                  placeholder="Pathway / who it's for"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.description || enabled ? (
                  <EditableText
                    as="p"
                    className="t10-muted"
                    value={it.description}
                    placeholder="Where it starts, where it leads"
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { description: next })}
                  />
                ) : null}
                <a className="t10-textlink" href={it.linkHref || applyHref(ctx, { service: it.title })}>
                  <EditableText
                    as="span"
                    value={it.linkText || (enabled ? "" : "Ask about this pathway")}
                    placeholder="Ask about this pathway"
                    onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                  />
                  <IconArrow size={16} />
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
