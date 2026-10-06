"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT14 } from "../ctx";
import { IconClose } from "../icons";
import { splitTwoTone } from "../lib";
import { useFocusTrap } from "../shop/useFocusTrap";

type Review = TestimonialsSection["items"][number];

const roleOf = (t: Review) => [t.role, t.company].filter(Boolean).join(", ");

/** Every review in a modal list. Mounted only while open so the focus trap runs for its lifetime. */
function ReviewsDialog({
  items,
  startAt,
  portalTo,
  onClose,
}: {
  items: Review[];
  startAt: number;
  portalTo: HTMLElement;
  onClose: () => void;
}) {
  const ref = useFocusTrap<HTMLDivElement>(onClose, ".t14-rev-close");
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-i="${startAt}"]`)?.scrollIntoView({ block: "start" });
  }, [ref, startAt]);

  return createPortal(
    <div className="t14-rev-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="t14-rev-dialog" role="dialog" aria-modal="true" aria-labelledby="t14-rev-dialog-h" tabIndex={-1}>
        <div className="t14-rev-dialog-head">
          <h2 id="t14-rev-dialog-h">Customer reviews</h2>
          <button type="button" className="t14-rev-close" onClick={onClose} aria-label="Close reviews">
            <IconClose size={18} />
          </button>
        </div>
        <ul className="t14-rev-list">
          {items.map((t, i) => (
            <li key={i} data-i={i}>
              <blockquote>{t.quote}</blockquote>
              <p>
                <span>{t.name || "Customer"}</span>
                {roleOf(t) ? <span className="t14-rev-list-role">{roleOf(t)}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    portalTo,
  );
}

/** Customer words in a white card overlapping a paper band. No stars: testimonials carry no rating. */
export default function T14Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { photos } = useT14();
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const [dialog, setDialog] = useState<{ at: number; root: HTMLElement } | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "What customers say");
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());
  const real = items.filter((t) => t.quote?.trim());
  const photo = photos[2]?.url ?? null;
  const [lead, finish] = splitTwoTone(title);
  const open = (i: number, el: HTMLElement) => {
    const root = el.closest<HTMLElement>(".template14");
    if (!root) return;
    openerRef.current = el;
    setDialog({ at: i, root });
  };
  const close = () => {
    setDialog(null);
    // Safari does not focus a clicked button, so hand focus back explicitly once the dialog is gone.
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  return (
    <section className="t14-rev t14-band t14-paper" data-photo={!!photo}>
      {photo ? (
        <div className="t14-rev-photo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" loading="lazy" />
        </div>
      ) : null}
      <div className="t14-container t14-rev-in">
        <header className="t14-rev-head t14-reveal">
          <span className="t14-chip t14-rev-count">
            {real.length} customer review{real.length === 1 ? "" : "s"}
          </span>
          {enabled ? (
            <EditableText as="h2" className="t14-h2" value={title} placeholder="What customers say" onCommit={(next) => set({ title: next })} />
          ) : (
            <h2 className="t14-h2">
              {lead ? <span className="t14-dim">{lead}</span> : null}
              {lead ? <br /> : null}
              <span>{finish}</span>
            </h2>
          )}
          {real.length > 0 ? (
            <button type="button" className="t14-pill t14-pill-white t14-rev-all" onClick={(e) => open(0, e.currentTarget)}>
              Read all reviews
            </button>
          ) : null}
        </header>

        <div
          className="t14-rev-card t14-reveal"
          data-editing={enabled}
          style={{ ["--n" as string]: Math.min(Math.max(items.length, 1), 3) }}
          {...(enabled ? {} : { role: "region", "aria-label": "Customer reviews", tabIndex: 0 })}
        >
          {items.map((t, idx) => (
            <figure key={idx} className="t14-rev-col">
              <EditableText
                as="blockquote"
                className="t14-rev-quote"
                value={t.quote ?? ""}
                placeholder="What a customer said about their order."
                multiline
                onCommit={(next) => setItem("items", items, idx, { quote: next })}
              />
              <figcaption className="t14-rev-foot">
                {t.name || enabled ? (
                  <EditableText
                    as="span"
                    className="t14-rev-name"
                    value={t.name ?? ""}
                    placeholder="Name"
                    onCommit={(next) => setItem("items", items, idx, { name: next })}
                  />
                ) : null}
                <span className="t14-chip t14-rev-chip">
                  <span aria-hidden="true">✓</span>
                  {t.role || enabled ? (
                    <EditableText
                      as="span"
                      value={t.role ?? ""}
                      placeholder="City"
                      onCommit={(next) => setItem("items", items, idx, { role: next })}
                    />
                  ) : (
                    "Customer"
                  )}
                  {t.company ? <span>{`${t.role ? ", " : ""}${t.company}`}</span> : null}
                </span>
                {!enabled && t.quote?.trim() ? (
                  <button
                    type="button"
                    className="t14-rev-more"
                    onClick={(e) => open(Math.max(0, real.indexOf(t)), e.currentTarget)}
                  >
                    Read all
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      {dialog ? <ReviewsDialog items={real} startAt={dialog.at} portalTo={dialog.root} onClose={close} /> : null}
    </section>
  );
}
