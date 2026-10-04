"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { quoteHref, useT12 } from "../ctx";
import { IconArrow, IconHelmet } from "../icons";

/**
 * Use cases as "Projects": square cards with a cover borrowed from the site's gallery (else a
 * blueprint panel), a "Project 01" plate, title, description and a quote link.
 */
export default function T12UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT12();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Recent projects");
  const description = section.description || "";
  // Editor: the real items untouched (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t12-section t12-projects-section">
      <div className="t12-container">
        <header className="t12-head t12-head-split t12-reveal">
          <div>
            <p className="t12-label t12-kicker">
              <span className="t12-kicker-sq" aria-hidden="true" /> Projects
            </p>
            <EditableText as="h2" className="t12-h2" value={title} placeholder="Recent projects" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t12-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <ul className="t12-projects" data-count={items.length}>
          {items.map((it, idx) => {
            const cover = photos.length ? photos[(idx + 1) % photos.length] : null;
            const linkText = it.linkText || (enabled ? "" : "Start a similar project");
            return (
              <li key={idx} className="t12-project t12-reveal">
                <div className="t12-project-cover" data-photo={!!cover}>
                  {cover ? (
                    // The title below names the card; the borrowed cover is decorative.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">
                      <IconHelmet size={44} />
                    </span>
                  )}
                  <span className="t12-project-plate" aria-hidden="true">
                    Project {pad2(idx + 1)}
                  </span>
                </div>
                <div className="t12-project-body">
                  <EditableText
                    as="h3"
                    className="t12-project-title"
                    value={it.title ?? ""}
                    placeholder="Project name / location"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t12-muted"
                      value={it.description ?? ""}
                      placeholder="What the job was, where, and what you delivered"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  <a className="t12-textlink" href={it.linkHref || quoteHref(ctx)}>
                    <EditableText
                      as="span"
                      value={linkText}
                      placeholder="Start a similar project"
                      onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                    />
                    <IconArrow size={16} />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
