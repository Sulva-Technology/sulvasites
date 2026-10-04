"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { shopHref, useT13 } from "../ctx";
import { IconArrow, IconHanger } from "../icons";

/**
 * Use cases as "Collections": tall image cards with a cover borrowed from the site's gallery
 * (else a tinted panel), a numeral, title, description and a link (defaults to the shop).
 */
export default function T13UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { photos, shop, baseUrl } = useT13();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Collections");
  const description = section.description || "";
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section className="t13-section t13-collections-section">
      <div className="t13-container">
        <header className="t13-head t13-head-split t13-reveal">
          <div>
            <p className="t13-label">Collections</p>
            <EditableText as="h2" className="t13-h2" value={title} placeholder="Collections" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t13-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <ul className="t13-collections" data-count={items.length}>
          {items.map((it, idx) => {
            const cover = photos.length ? photos[(idx + 3) % photos.length] : null;
            const href = it.linkHref || (shop ? shopHref(baseUrl) : "");
            const linkText = it.linkText || (enabled ? "" : shop ? "Shop now" : "");
            return (
              <li key={idx} className="t13-collection t13-reveal">
                <div className="t13-collection-cover" data-photo={!!cover}>
                  {cover ? (
                    // The title below names the card; the borrowed cover is decorative.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">
                      <IconHanger size={44} />
                    </span>
                  )}
                  <span className="t13-collection-no" aria-hidden="true">
                    {pad2(idx + 1)}
                  </span>
                </div>
                <div className="t13-collection-body">
                  <EditableText
                    as="h3"
                    className="t13-collection-title"
                    value={it.title ?? ""}
                    placeholder="Collection name"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t13-muted"
                      value={it.description ?? ""}
                      placeholder="What is in it, and the mood"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  {href && (linkText || enabled) ? (
                    <a className="t13-textlink" href={href}>
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
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
