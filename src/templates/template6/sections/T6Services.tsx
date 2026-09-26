"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { SERVICE_ICONS } from "../icons";

const FALLBACK = [
  { title: "Buy a home", desc: "Shortlists matched to your brief, accompanied viewings and help through every document." },
  { title: "Rent with confidence", desc: "Verified landlords, clear tenancy terms and a smooth move-in." },
  { title: "Sell for the right price", desc: "Accurate valuation, professional marketing and qualified buyers." },
  { title: "Property management", desc: "Tenants, maintenance and rent collection handled for you." },
];

export default function T6Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section id="services" className="t6-section">
      <div className="t6-container">
        <div className="t6-head t6-reveal">
          <div>
            <span className="t6-kicker">What we do</span>
            <h2 className="t6-h2">Every step of your property journey</h2>
          </div>
        </div>

        <div className="t6-services">
          {items.map((s, idx) => {
            const Icon = SERVICE_ICONS[idx % SERVICE_ICONS.length];
            return (
              <article key={idx} className="t6-service t6-reveal">
                <span className="t6-service-icon">
                  <Icon />
                </span>
                <span className="t6-service-num">{pad2(idx + 1)}</span>
                <EditableText
                  as="h3"
                  className="t6-h3"
                  value={s.title}
                  placeholder="Service title"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <EditableText
                  as="p"
                  className="t6-muted"
                  value={s.desc}
                  placeholder="Service description"
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
