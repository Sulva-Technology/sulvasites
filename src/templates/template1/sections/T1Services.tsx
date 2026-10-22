"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { useT1 } from "../ctx";
import { IconArrow, SERVICE_ICONS } from "../icons";

const FALLBACK = [
  { title: "Strategy & planning", desc: "Clarify priorities and build a practical roadmap your team can execute." },
  { title: "Operations", desc: "Streamline processes, reduce cost and improve service quality." },
  { title: "Advisory", desc: "Senior guidance on the decisions that shape your organisation." },
];

/** Services in a ruled grid with an accent bar on hover. */
export default function T1Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const { baseUrl } = useT1();
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK.map(() => ({}) as Partial<(typeof section.items)[number]>)).map((it) => ({
    title: it.title || "",
    desc: it.desc || "",
  }));

  return (
    <section id="services" className="t1-section">
      <div className="t1-container">
        <div className="t1-head t1-reveal">
          <div>
            <span className="t1-over">What we do</span>
            <h2 className="t1-h2">
              Services built around <em>your goals</em>
            </h2>
          </div>
          <p className="t1-lead">Here is how we can help. Get in touch to talk through what you need.</p>
        </div>

        <div className="t1-services t1-reveal">
          {items.map((s, idx) => {
            const Icon = SERVICE_ICONS[idx % SERVICE_ICONS.length];
            return (
              <article key={idx} className="t1-service">
                <div className="t1-service-top">
                  <span className="t1-icon">
                    <Icon />
                  </span>
                  <span className="t1-mono t1-muted">{pad2(idx + 1)}</span>
                </div>
                <EditableText as="h3" className="t1-h3" value={s.title} placeholder={FALLBACK[idx % FALLBACK.length].title} onCommit={(next) => setItem("items", items, idx, { title: next })} />
                <EditableText
                  as="p"
                  className="t1-muted"
                  value={s.desc}
                  placeholder={FALLBACK[idx % FALLBACK.length].desc}
                  multiline
                  onCommit={(next) => setItem("items", items, idx, { desc: next })}
                />
                <a className="t1-more" href={`${baseUrl}/contact`}>
                  Enquire <IconArrow size={16} />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
