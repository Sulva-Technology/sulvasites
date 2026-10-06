"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { reserveHref, shopHref, splitPrice, useT7 } from "../ctx";
import { IconArrow, Ornament } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  "A line about the dish — what's in it and how it's cooked.",
  "Ingredients, sides and anything guests should know.",
];

/**
 * Services rendered as a printed menu: two columns of dish names with dotted leaders
 * running to the price (parsed from "Name · ₦0,000") or a small ornament.
 */
export default function T7Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const ctx = useT7();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Placeholders only while editing; visitors see real dishes only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));
  const single = items.length < 4;

  return (
    <section id="menu" className="t7-section t7-menu-section">
      <div className="t7-container">
        <div className="t7-menu-card t7-reveal">
          <header className="t7-head t7-head-center">
            <span className="t7-rule-label">
              <i aria-hidden="true" />
              <span>From the kitchen</span>
              <i aria-hidden="true" />
            </span>
            <h2 className="t7-h2">The Menu</h2>
          </header>

          <ul className="t7-menu" data-single={single}>
            {items.map((it, idx) => {
              const [name, price] = enabled ? [it.title, null] : splitPrice(it.title);
              return (
                <li key={idx} className="t7-dish">
                  <div className="t7-dish-line">
                    <EditableText
                      as="h3"
                      className="t7-dish-name"
                      value={enabled ? it.title : name}
                      placeholder="Dish name · price"
                      onCommit={(next) => setItem("items", items, idx, { title: next })}
                    />
                    <i className="t7-leader" aria-hidden="true" />
                    {price ? (
                      <span className="t7-dish-price">{price}</span>
                    ) : (
                      <span className="t7-dish-mark" aria-hidden="true">
                        <Ornament size={9} />
                      </span>
                    )}
                  </div>
                  {it.desc || enabled ? (
                    <EditableText
                      as="p"
                      className="t7-dish-desc"
                      value={it.desc}
                      placeholder={HINTS[idx % HINTS.length]}
                      multiline
                      onCommit={(next) => setItem("items", items, idx, { desc: next })}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="t7-menu-foot">
            {ctx.shop ? (
              <a className="t7-btn" href={shopHref(ctx.baseUrl)}>
                Order online <IconArrow size={16} />
              </a>
            ) : null}
            <a className={ctx.shop ? "t7-btn t7-btn-ghost" : "t7-btn"} href={reserveHref(ctx)}>
              Reserve a table {ctx.shop ? null : <IconArrow size={16} />}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
