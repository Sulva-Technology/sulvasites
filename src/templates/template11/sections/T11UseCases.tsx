"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { planHref, useT11 } from "../ctx";
import { IconArrow, IconGlass } from "../icons";

/**
 * Use cases as "Occasions & venues": rounded photo cards (covers borrowed from the site's
 * gallery, else a gradient with a glass icon), a title, description and an enquiry link.
 */
export default function T11UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT11();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Occasions & venues");
  const description = section.description || "";
  const source = enabled ? section.items : section.items?.filter((it) => it.title?.trim());
  const items = (source?.length ? source : [{ title: "", description: "" }]).map((it) => ({
    ...it,
    title: it.title || "",
    description: it.description || "",
  }));

  return (
    <section className="t11-section t11-venues-section">
      <div className="t11-container">
        <header className="t11-head t11-head-split t11-reveal">
          <div>
            <span className="t11-kicker">Occasions</span>
            <EditableText as="h2" className="t11-h2" value={title} placeholder="Occasions & venues" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t11-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <ul className="t11-venues" data-count={items.length}>
          {items.map((it, idx) => {
            const cover = photos.length ? photos[(idx + 3) % photos.length] : null;
            return (
              <li key={idx} className="t11-venue t11-reveal">
                <div className="t11-venue-cover" data-photo={!!cover}>
                  {cover ? (
                    // The title below names the card; the borrowed cover is decorative.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">
                      <IconGlass size={40} />
                    </span>
                  )}
                  <span className="t11-venue-no" aria-hidden="true">
                    {idx + 1}
                  </span>
                </div>
                <div className="t11-venue-body">
                  <EditableText
                    as="h3"
                    className="t11-venue-title"
                    value={it.title}
                    placeholder="Occasion / venue"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t11-muted"
                      value={it.description}
                      placeholder="Capacity, setting, what it's perfect for"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  <a className="t11-textlink" href={it.linkHref || planHref(ctx, { service: it.title })}>
                    <EditableText
                      as="span"
                      value={it.linkText || (enabled ? "" : "Ask about this")}
                      placeholder="Ask about this"
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
