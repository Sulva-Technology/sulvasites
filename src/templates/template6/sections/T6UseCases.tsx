"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { UseCasesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT6 } from "../ctx";
import { IconArrow, IconHome } from "../icons";

const FALLBACK: UseCasesSection["items"] = [
  { title: "Four-bedroom family home", description: "Describe the property: location, size, standout features and what makes it special." },
  { title: "Modern city apartment", description: "Add the key details buyers or renters look for first." },
  { title: "Serviced plot in a new estate", description: "Summarise the opportunity, documentation status and access." },
];

/** Use cases presented as property listings. Covers reuse the site's gallery photos. */
export default function T6UseCases({ section, sectionIndex }: { section: UseCasesSection; sectionIndex?: number }) {
  const { baseUrl, photos } = useT6();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Featured properties";
  const description = section.description || "";
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    ...it,
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    description: it.description || FALLBACK[i % FALLBACK.length].description,
  }));

  return (
    <section id="properties" className="t6-section">
      <div className="t6-container">
        <div className="t6-head t6-reveal">
          <div>
            <span className="t6-kicker">Listings</span>
            <EditableText as="h2" className="t6-h2" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
            {description || enabled ? (
              <EditableText
                as="p"
                className="t6-lead"
                value={description}
                placeholder="Short intro (optional)"
                multiline
                onCommit={(next) => set({ description: next })}
              />
            ) : null}
          </div>
          <a className="t6-btn t6-btn-outline" href={`${baseUrl}/contact`}>
            Request the full list
          </a>
        </div>

        <div className="t6-listings">
          {items.map((it, idx) => {
            const photo = photos.length ? photos[idx % photos.length] : null;
            const featured = idx === 0 && items.length > 1;
            return (
              <article key={idx} className="t6-listing t6-reveal" data-featured={featured}>
                <div className="t6-listing-media">
                  <div className="t6-badges">
                    {featured ? <span className="t6-badge t6-badge-accent">Featured</span> : null}
                    <span className="t6-badge">Available</span>
                  </div>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.alt || it.title} loading="lazy" />
                  ) : (
                    <IconHome size={56} />
                  )}
                </div>
                <div className="t6-listing-body">
                  <EditableText
                    as="h3"
                    className="t6-h3"
                    value={it.title}
                    placeholder="Property title"
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                  <EditableText
                    as="p"
                    className="t6-muted"
                    value={it.description}
                    placeholder="Property description"
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { description: next })}
                  />
                  <div className="t6-listing-foot">
                    <a className="t6-textlink" href={it.linkHref || `${baseUrl}/contact`}>
                      <EditableText
                        as="span"
                        value={it.linkText || "Enquire about this property"}
                        placeholder="Link text"
                        onCommit={(next) => setItem("items", items, idx, { linkText: next })}
                      />
                      <IconArrow size={16} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
