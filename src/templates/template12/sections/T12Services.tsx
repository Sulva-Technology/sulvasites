"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { quoteHref, useT12 } from "../ctx";
import { IconArrow, TradeIcon } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Service name", desc: "What the job covers and who it's for." },
  { title: "Another service", desc: "Repairs, installs, upgrades — keep it plain and specific." },
  { title: "Third service", desc: "One or two short sentences." },
];

/**
 * Services as square icon tiles: a trade icon picked from the title, a stencil number, title,
 * description and a "Get a quote" link that preselects the service on the quote form.
 */
export default function T12Services({
  section,
  sectionIndex,
  anchor,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const ctx = useT12();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank tile when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  return (
    <section id={anchor ? "services" : undefined} className="t12-section t12-services-section">
      <div className="t12-container">
        <header className="t12-head t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" /> Services
          </p>
          <h2 className="t12-h2">What we do</h2>
        </header>

        <ul className="t12-services" data-count={items.length}>
          {items.map((it, idx) => {
            const t = it.title?.trim() ?? "";
            return (
              <li key={idx} className="t12-service t12-reveal">
                <div className="t12-service-top">
                  <span className="t12-service-ico" aria-hidden="true">
                    <TradeIcon title={t} />
                  </span>
                  <span className="t12-service-no" aria-hidden="true">
                    {pad2(idx + 1)}
                  </span>
                </div>
                <EditableText
                  as="h3"
                  className="t12-service-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t12-muted"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <a className="t12-textlink" href={quoteHref(ctx, { service: t })} aria-label={`Get a quote for ${t || "this service"}`}>
                  Get a quote <IconArrow size={16} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
