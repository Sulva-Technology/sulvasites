"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { FEATURE_ICONS } from "../icons";

const FALLBACK = [
  { title: "Everything in one place", desc: "One simple home for the work that used to live in ten different tools." },
  { title: "Set up in minutes", desc: "No training needed — invite your team and go." },
  { title: "Always on time", desc: "Smart reminders keep everyone on schedule." },
  { title: "Secure by default", desc: "Your data is encrypted and backed up automatically." },
  { title: "Insights that help", desc: "Clear reports show what's working at a glance." },
];

/** Services as a bento feature grid (first item is the large dark tile). */
export default function T4Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const { setItem } = useSectionEditor(section, sectionIndex);
  const items = (section.items?.length ? section.items : FALLBACK).map((it, i) => ({
    title: it.title || FALLBACK[i % FALLBACK.length].title,
    desc: it.desc || FALLBACK[i % FALLBACK.length].desc,
  }));

  return (
    <section id="features" className="t4-section">
      <div className="t4-container">
        <div className="t4-head t4-center t4-reveal">
          <span className="t4-label">Features</span>
          <h2 className="t4-h2">
            Built for the way you <span className="t4-mark">work</span>
          </h2>
        </div>
        <div className="t4-bento">
          {items.map((f, idx) => {
            const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
            return (
              <article key={idx} className="t4-feature t4-reveal">
                <span className="t4-feature-icon">
                  <Icon />
                </span>
                <EditableText
                  as="h3"
                  className="t4-h3"
                  value={f.title}
                  placeholder="Feature"
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                <EditableText
                  as="p"
                  className="t4-muted"
                  value={f.desc}
                  placeholder="Description"
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
