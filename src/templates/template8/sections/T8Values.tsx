"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT8 } from "../ctx";
import { IconCheck, IconCross } from "../icons";

const FALLBACK = [
  { title: "Reason patients choose you", desc: "A sentence that explains it — time, care, convenience." },
  { title: "Another reason", desc: "Something specific about how your practice works." },
  { title: "One more", desc: "Keep each point short and concrete." },
];

/** Values as a "Why patients choose us" checklist beside a rounded photo panel. */
export default function T8Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { photos } = useT8();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Placeholders only while editing; visitors see real points only.
  const items = enabled
    ? (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
        title: it.title || FALLBACK[i % FALLBACK.length].title,
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));
  const photo = photos.length > 3 ? photos[3] : photos[photos.length - 1];

  return (
    <section className="t8-section t8-why-section">
      <div className="t8-container">
        <div className="t8-why" data-photo={!!photo}>
          <div className="t8-why-media t8-reveal">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt={photo.alt || ""} loading="lazy" />
            ) : (
              <span className="t8-photo-fallback" aria-hidden="true">
                <IconCross size={56} />
              </span>
            )}
          </div>

          <div className="t8-why-body">
            <header className="t8-head t8-reveal">
              <span className="t8-eyebrow">Our approach</span>
              <h2 className="t8-h2">Why patients choose us</h2>
            </header>
            <ul className="t8-checklist">
              {items.map((v, idx) => (
                <li key={idx} className="t8-check t8-reveal">
                  <span className="t8-check-ico" aria-hidden="true">
                    <IconCheck size={16} />
                  </span>
                  <div>
                    <EditableText
                      as="h3"
                      className="t8-check-title"
                      value={v.title}
                      placeholder="Reason"
                      onCommit={(next) => setItem("items", items, idx, { title: next })}
                    />
                    {v.desc || enabled ? (
                      <EditableText
                        as="p"
                        className="t8-muted"
                        value={v.desc}
                        placeholder="Short description"
                        multiline
                        onCommit={(next) => setItem("items", items, idx, { desc: next })}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
