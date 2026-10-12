"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { bookHref, useT5 } from "../ctx";
import { useFitsIndustry } from "@/templates/shared/fit";

const FALLBACK = [
  { title: "Soft glam", desc: "Radiant skin, soft definition and lashes — polished but still you." },
  { title: "Bridal", desc: "Trial session plus wedding-day makeup designed to last through every moment." },
  { title: "Special events", desc: "Photoshoots, parties and red-carpet looks with long-wear finish." },
  { title: "Brows & lashes", desc: "Shaping, tint and lifts that frame your face beautifully." },
];

/** Services as an elegant price-list style menu with a Book link per item. */
export default function T5Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const fit = useFitsIndustry();
  const ctx = useT5();
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section id="services" className="t5-section">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">{fit ? "The menu" : "What we offer"}</span>
          <h2 className="t5-title">
            {fit ? <>Services &amp; <em>treatments</em></> : <>Our <em>services</em></>}
          </h2>
          <p className="t5-lead">{fit ? "Every appointment begins with a consultation so your look is made for you." : "Tell us what you need and we'll help you choose."}</p>
        </div>

        <div className="t5-menu t5-reveal">
          {items.map((s, idx) => (
            <div key={idx} className="t5-menu-item">
              <div className="t5-menu-row">
                <EditableText
                  as="h3"
                  className="t5-h3"
                  value={s.title}
                  placeholder="Service"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <span className="t5-menu-dots" aria-hidden="true" />
                <a className="t5-menu-book" href={bookHref(ctx, s.title)}>
                  Book
                </a>
              </div>
              <EditableText
                as="p"
                value={s.desc}
                placeholder="Description"
                multiline
                onCommit={(next) => setItem("items", items, idx, { desc: next })}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
