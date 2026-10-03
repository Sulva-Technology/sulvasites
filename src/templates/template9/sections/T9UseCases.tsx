"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { joinHref, useT9 } from "../ctx";
import { IconArrow, IconDumbbell } from "../icons";

/**
 * Use cases as "Programmes / who it's for" panels: dark photo tiles with a slanted bottom,
 * condensed title over the image, then text and a link to the trial form.
 */
export default function T9UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const ctx = useT9();
  const { photos } = ctx;
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const title = section.title || "Programmes for every goal";
  const description = section.description || "";
  const source = enabled ? section.items : section.items?.filter((it) => it.title?.trim());
  const items = (source?.length ? source : [{ title: "", description: "" }]).map((it) => ({
    ...it,
    title: it.title || "",
    description: it.description || "",
  }));
  // Offset into the photo pool so tiles don't repeat the hero image.
  const offset = photos.length > 3 ? 3 : 0;

  return (
    <section className="t9-section t9-programmes-section">
      <div className="t9-container">
        <header className="t9-head t9-head-split t9-reveal">
          <div>
            <span className="t9-kicker t9-kicker-dark">Programmes</span>
            <EditableText as="h2" className="t9-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t9-head-note"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : null}
        </header>

        <div className="t9-programmes" data-count={Math.min(items.length, 3)}>
          {items.map((it, idx) => {
            const photo = photos.length ? photos[(idx + offset) % photos.length] : null;
            return (
              <article key={idx} className="t9-programme t9-reveal">
                <div className="t9-programme-media" data-photo={!!photo}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.alt || it.title} loading="lazy" />
                  ) : (
                    <IconDumbbell size={56} />
                  )}
                  <span className="t9-programme-no" aria-hidden="true">
                    {pad2(idx + 1)}
                  </span>
                </div>
                <div className="t9-programme-body">
                  <EditableText
                    as="h3"
                    className="t9-programme-title"
                    value={it.title}
                    placeholder="Programme / who it's for"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  {it.description || enabled ? (
                    <EditableText
                      as="p"
                      className="t9-muted"
                      value={it.description}
                      placeholder="What it involves and the result it's built for"
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { description: next })}
                    />
                  ) : null}
                  <a className="t9-textlink" href={it.linkHref || joinHref(ctx, it.title)}>
                    <EditableText
                      as="span"
                      value={it.linkText || (enabled ? "" : "Start free trial")}
                      placeholder="Start free trial"
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
