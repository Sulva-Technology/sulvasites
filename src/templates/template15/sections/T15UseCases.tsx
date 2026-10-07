"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { enquireHref, specChips, useT15 } from "../ctx";
import { IconArrowUpRight, IconWheel } from "../icons";
import { T15Chips } from "./T15Hero";

/**
 * The collection: tall photo cards in a horizontal snap-scroller. Each card borrows a cover
 * from the site's gallery and carries a glass caption — title, spec chips (year, status,
 * price…) and the rest of the description, revealed on hover on desktop. A card links to the
 * enquiry form with the car preselected. The first collection on a page owns `#collection`.
 */
export default function T15UseCases({
  section,
  sectionIndex,
  anchor,
}: {
  section: UseCasesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const ctx = useT15();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "The collection");
  const description = section.description || "";
  // Editor: the real items untouched (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "collection" : undefined} className="t15-section t15-collection-section">
      <div className="t15-container">
        <header className="t15-head t15-head-split t15-reveal">
          <EditableText as="h2" className="t15-h2" value={title} placeholder="The collection" onCommit={(next) => set({ title: next })} />
          {description || enabled ? (
            <EditableText
              as="p"
              className="t15-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>
      </div>

      <ul className="t15-rail" data-count={items.length} tabIndex={0} aria-label={title || "Collection"}>
        {items.map((it, idx) => {
          const cover = photos.length ? photos[(idx + 1) % photos.length] : null;
          const spec = specChips(it.description);
          const href = it.linkHref || enquireHref(ctx, it.title);
          const body = (
            <>
              <span className="t15-car-cover" data-photo={!!cover}>
                {cover ? (
                  // The title names the card; the borrowed cover is decorative.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt="" loading="lazy" />
                ) : (
                  <span className="t15-photo-fallback" aria-hidden="true">
                    <IconWheel size={56} />
                  </span>
                )}
              </span>
              <span className="t15-car-go t15-glass t15-glass-dark" aria-hidden="true">
                <IconArrowUpRight size={18} />
              </span>
              <span className="t15-car-caption t15-glass t15-glass-dark">
                <EditableText
                  as="h3"
                  className="t15-car-title"
                  value={it.title ?? ""}
                  placeholder="Car / model and year"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {enabled ? (
                  <EditableText
                    as="p"
                    className="t15-car-text"
                    value={it.description ?? ""}
                    placeholder="1967 · V8 · Available · then a sentence about the car"
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { description: next })}
                  />
                ) : (
                  <>
                    <T15Chips chips={spec.chips} />
                    {spec.text ? <span className="t15-car-text">{spec.text}</span> : null}
                  </>
                )}
              </span>
            </>
          );
          return (
            <li key={idx} className="t15-car t15-reveal">
              {enabled ? (
                <div className="t15-car-link">{body}</div>
              ) : (
                <a className="t15-car-link" href={href} aria-label={`Enquire about ${it.title}`}>
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
