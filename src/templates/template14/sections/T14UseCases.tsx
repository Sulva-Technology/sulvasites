"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconStore } from "../icons";

/**
 * Use cases as "Highlights": a two-column bento of paper cards with a cover borrowed from the
 * site's gallery (else a white tile), title, description and an arrow pill link (defaults to the shop).
 */
export default function T14UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { photos, shop, baseUrl } = useT14();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Highlights");
  const description = section.description || "";
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t14-section t14-uc">
      <div className="t14-container">
        <header className="t14-sec-head t14-reveal">
          <EditableText as="h2" className="t14-h2" value={title} placeholder="Highlights" onCommit={(next) => set({ title: next })} />
          {description || enabled ? (
            <EditableText
              as="p"
              className="t14-sec-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <ul className="t14-uc-grid" data-count={items.length}>
          {items.map((it, idx) => {
            const cover = photos.length ? photos[(idx + 3) % photos.length] : null;
            const href = it.linkHref || (shop ? shopHref(baseUrl) : "");
            const linkText = it.linkText || (enabled ? "" : shop ? "Shop now" : "");
            return (
              <li key={idx} className="t14-uc-card t14-paper t14-reveal" style={{ ["--d" as string]: idx % 2 }}>
                <div className="t14-uc-body">
                  <EditableText
                    as="h3"
                    className="t14-uc-title"
                    value={it.title ?? ""}
                    placeholder="Highlight name"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t14-uc-desc"
                      value={it.description ?? ""}
                      placeholder="What is in it, and the mood"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  {href && (linkText || enabled) ? (
                    <a className="t14-pill t14-pill-white t14-uc-link" href={href}>
                      <EditableText
                        as="span"
                        value={linkText}
                        placeholder="Shop now"
                        onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                      />
                      <IconArrow size={16} />
                    </a>
                  ) : null}
                </div>
                <div className="t14-uc-tile" data-photo={!!cover} aria-hidden="true">
                  {cover ? (
                    // The title names the card; the borrowed cover is decorative.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt="" loading="lazy" />
                  ) : (
                    <IconStore size={40} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
