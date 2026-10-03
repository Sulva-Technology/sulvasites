"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { reserveHref, useT7 } from "../ctx";
import { IconArrow, IconCutlery, Ornament } from "../icons";

/**
 * Use cases as "occasions" (private dining, celebrations, catering…): photo cards whose
 * enquiry link pre-selects the occasion in the reservation form (?occasion=).
 */
export default function T7UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT7();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || "Gatherings & occasions";
  const description = section.description || "";
  const source = enabled ? section.items : section.items?.filter((it) => it.title?.trim());
  const items = (source?.length ? source : [{ title: "", description: "" }]).map((it) => ({
    ...it,
    title: it.title || "",
    description: it.description || "",
  }));
  // Offset into the photo pool so cards don't repeat the hero image.
  const offset = photos.length > 3 ? 3 : 0;

  return (
    <section className="t7-section t7-occasions-section">
      <div className="t7-container">
        <header className="t7-head t7-head-split t7-reveal">
          <div>
            <span className="t7-eyebrow">
              <Ornament /> Occasions
            </span>
            <EditableText as="h2" className="t7-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t7-lead"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <div className="t7-occasions" data-count={Math.min(items.length, 3)}>
          {items.map((it, idx) => {
            const photo = photos.length ? photos[(idx + offset) % photos.length] : null;
            return (
              <article key={idx} className="t7-occasion t7-reveal">
                <div className="t7-occasion-media">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.alt || it.title} loading="lazy" />
                  ) : (
                    <IconCutlery size={40} />
                  )}
                  <span className="t7-occasion-num">{pad2(idx + 1)}</span>
                </div>
                <div className="t7-occasion-body">
                  <EditableText
                    as="h3"
                    className="t7-h3"
                    value={it.title}
                    placeholder="Occasion"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t7-muted"
                      value={it.description}
                      placeholder="What's included, group sizes…"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  <a className="t7-textlink" href={it.linkHref || reserveHref(ctx, it.title)}>
                    <EditableText
                      as="span"
                      value={it.linkText || "Enquire"}
                      placeholder="Link text"
                      onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                    />
                    <IconArrow size={16} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
