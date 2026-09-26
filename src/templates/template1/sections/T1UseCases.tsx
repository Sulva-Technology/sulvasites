"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { useT1 } from "../ctx";
import { IconArrow } from "../icons";

const FALLBACK: UseCasesSection["items"] = [
  { title: "Restructuring a regional operation", description: "Describe the client's challenge, your approach and the measurable result." },
  { title: "Digital transformation roadmap", description: "Summarise the engagement and the impact it delivered." },
  { title: "Growth strategy for a new market", description: "Share the outcome in one or two concrete sentences." },
];

/** Use cases as case-study cards; covers reuse gallery photos when available. */
export default function T1UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { baseUrl, photos } = useT1();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Case studies";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));

  return (
    <section className="t1-section">
      <div className="t1-container">
        <div className="t1-head t1-reveal">
          <div>
            <span className="t1-over">Our work</span>
            <EditableText as="h2" className="t1-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          </div>
          {description || enabled ? (
            <EditableText
              as="p"
              className="t1-lead"
              value={description}
              placeholder="Short intro (optional)"
              multiline
              onCommit={(next) => set({ description: next })}
            />
          ) : (
            <span />
          )}
        </div>

        <div className="t1-cases">
          {items.map((it, idx) => {
            const photo = photos.length ? photos[(idx + 1) % photos.length] : null;
            return (
              <article key={idx} className="t1-case t1-reveal">
                <div className="t1-case-media">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.alt || ""} loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{pad2(idx + 1)}</span>
                  )}
                </div>
                <div className="t1-case-body">
                  <span className="t1-over">Case study {pad2(idx + 1)}</span>
                  <EditableText as="h3" className="t1-h3" value={it.title} placeholder="Title" onCommit={(next) => setItem("items", items, idx, { title: next })} />
                  <EditableText
                    as="p"
                    className="t1-muted"
                    value={it.description}
                    placeholder="Summary"
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { description: next })}
                  />
                  <a className="t1-more" href={it.linkHref || `${baseUrl}/contact`}>
                    <EditableText
                      as="span"
                      value={it.linkText || "Read case study"}
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
