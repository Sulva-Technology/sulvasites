"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT2 } from "../ctx";

const FALLBACK: UseCasesSection["items"] = [
  { title: "Rebuilding a heritage brand", description: "Describe the project: the brief, the idea and what it changed." },
  { title: "A magazine in six weeks", description: "Summarise the story behind the work in a sentence or two." },
  { title: "Portraits of a city", description: "Share what made this project worth talking about." },
];

/** Use cases as a front page: lead story with image + numbered story list. */
export default function T2UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { baseUrl, photos } = useT2();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Selected stories";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));
  const [lead, ...rest] = items;
  const leadPhoto = photos[1] ?? photos[0];

  const readLink = (it: (typeof items)[number], idx: number) => (
    <a className="t2-read" href={it.linkHref || `${baseUrl}/contact`}>
      <EditableText as="span" value={it.linkText || "Read the story"} placeholder="Link text" onCommit={(next) => setItem("items", items, idx, { linkText: next })} />
      →
    </a>
  );

  return (
    <section id="stories" className="t2-section t2-section-rule">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Features</span>
            <EditableText as="h2" className="t2-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
            {description || enabled ? (
              <EditableText as="p" className="t2-deck" value={description} placeholder="Intro (optional)" multiline onCommit={(next) => set({ description: next })} />
            ) : null}
          </div>
        </div>

        <div className="t2-stories">
          <article className="t2-lead-story t2-reveal">
            <div className="t2-lead-media">
              {leadPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={leadPhoto.url} alt={leadPhoto.alt || ""} loading="lazy" />
              ) : (
                <span aria-hidden="true">01</span>
              )}
            </div>
            <span className="t2-kicker">Lead story</span>
            <EditableText as="h3" className="t2-h3" value={lead.title} placeholder="Title" onCommit={(next) => setItem("items", items, 0, { title: next })} />
            <EditableText as="p" className="t2-deck" value={lead.description} placeholder="Summary" multiline onCommit={(next) => setItem("items", items, 0, { description: next })} />
            <div>{readLink(lead, 0)}</div>
          </article>

          {rest.length ? (
            <div className="t2-story-list">
              {rest.map((it, i) => (
                <article key={i} className="t2-story t2-reveal">
                  <span className="t2-story-num">{i + 2}</span>
                  <div>
                    <EditableText as="h3" className="t2-h3" value={it.title} placeholder="Title" onCommit={(next) => setItem("items", items, i + 1, { title: next })} />
                    <EditableText
                      as="p"
                      className="t2-muted"
                      value={it.description}
                      placeholder="Summary"
                      multiline
                      onCommit={(next) => setItem("items", items, i + 1, { description: next })}
                    />
                    <div>{readLink(it, i + 1)}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
