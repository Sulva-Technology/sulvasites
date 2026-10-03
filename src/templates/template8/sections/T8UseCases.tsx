"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { bookHref, useT8 } from "../ctx";
import { IconArrow, serviceIcon } from "../icons";

/**
 * Use cases as "Who we care for" cards (families, children, seniors…): photo or icon header,
 * text, and a link that opens the booking form with that topic preselected.
 */
export default function T8UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT8();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || "Who we care for";
  const description = section.description || "";
  const source = enabled ? section.items : section.items?.filter((it) => it.title?.trim());
  const items = (source?.length ? source : [{ title: "", description: "" }]).map((it) => ({
    ...it,
    title: it.title || "",
    description: it.description || "",
  }));
  // Offset into the photo pool so cards don't repeat the hero image.
  const offset = photos.length > 4 ? 4 : 0;

  return (
    <section className="t8-section t8-care-section">
      <div className="t8-container">
        <header className="t8-head t8-head-split t8-reveal">
          <div>
            <span className="t8-eyebrow">Care for every stage</span>
            <EditableText as="h2" className="t8-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t8-lead"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <div className="t8-care" data-count={Math.min(items.length, 3)}>
          {items.map((it, idx) => {
            const photo = photos.length ? photos[(idx + offset) % photos.length] : null;
            const Icon = serviceIcon(it.title, idx);
            return (
              <article key={idx} className="t8-care-card t8-reveal">
                <div className="t8-care-media" data-photo={!!photo}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.alt || it.title} loading="lazy" />
                  ) : (
                    <Icon size={40} />
                  )}
                </div>
                <div className="t8-care-body">
                  <EditableText
                    as="h3"
                    className="t8-h3"
                    value={it.title}
                    placeholder="Patient group"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t8-muted"
                      value={it.description}
                      placeholder="How you help them"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  <a className="t8-textlink" href={it.linkHref || bookHref(ctx, it.title)}>
                    <EditableText
                      as="span"
                      value={it.linkText || "Book a visit"}
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
