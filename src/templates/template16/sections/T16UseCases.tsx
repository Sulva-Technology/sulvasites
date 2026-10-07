"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildWhatsAppLink } from "@/templates/shared/links";
import { circleMeta, joinHref, useT16 } from "../ctx";
import { IconArrow, IconCircles } from "../icons";

/**
 * Communities: tall 3:4 photo cards (covers borrowed from the gallery), the name with its fee on
 * the right, detail chips, a short summary and a "Join this circle" row that opens the join form
 * with the circle preselected. The first communities section on a page owns `#communities`.
 */
export default function T16UseCases({
  section,
  sectionIndex,
  anchor,
}: {
  section: UseCasesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const ctx = useT16();
  const { photos, profile } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || (enabled ? "" : "Our communities");
  const description = section.description || "";
  // Editor: the real items untouched (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", description: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "communities" : undefined} className="t16-section">
      <div className="t16-container">
        <header className="t16-head-split t16-reveal">
          <div>
            <EditableText as="h2" className="t16-h2" value={title} placeholder="Our communities" onCommit={(next) => set({ title: next })} />
            {description || enabled ? (
              <EditableText
                as="p"
                className="t16-head-note"
                value={description}
                placeholder="Short intro (optional)"
                multiline
                onCommit={(next) => set({ description: next })}
              />
            ) : null}
          </div>
          {profile.whatsapp ? (
            <a className="t16-textlink t16-hide-sm" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
              Ask which circle fits you <IconArrow size={15} />
            </a>
          ) : null}
        </header>

        <ul className="t16-circles" data-count={items.length}>
          {items.map((it, idx) => {
            const cover = photos.length ? photos[(idx + 2) % photos.length] : null;
            const meta = circleMeta(it.description);
            const href = it.linkHref || joinHref(ctx, it.title);
            return (
              <li key={idx} className="t16-circle t16-reveal">
                <div className="t16-circle-cover" data-photo={!!cover}>
                  {cover ? (
                    // The title names the card; the borrowed cover is decorative.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt="" loading="lazy" />
                  ) : (
                    <span className="t16-photo-fallback" aria-hidden="true">
                      <IconCircles size={56} />
                    </span>
                  )}
                </div>
                <div className="t16-circle-top">
                  <EditableText
                    as="h3"
                    className="t16-h3"
                    value={it.title ?? ""}
                    placeholder="Community name"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {!enabled && meta.price ? (
                    <span className="t16-circle-price">
                      <strong>{meta.price}</strong>
                      <small>membership</small>
                    </span>
                  ) : null}
                </div>
                {enabled ? (
                  <EditableText
                    as="p"
                    className="t16-muted t16-small t16-circle-text"
                    value={it.description ?? ""}
                    placeholder="Online · ₦25,000 · then a sentence about who it's for"
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { description: next })}
                  />
                ) : (
                  <>
                    {meta.chips.length ? (
                      <ul className="t16-chips">
                        {meta.chips.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    ) : null}
                    {meta.text ? <p className="t16-muted t16-small t16-circle-text">{meta.text}</p> : null}
                  </>
                )}
                {enabled ? (
                  <span className="t16-circle-join">
                    <span>{it.linkText || "Join this circle"}</span>
                    <IconArrow size={16} />
                  </span>
                ) : (
                  <a className="t16-circle-join" href={href} aria-label={`Join ${it.title}`}>
                    <span>{it.linkText || "Join this circle"}</span>
                    <IconArrow size={16} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
