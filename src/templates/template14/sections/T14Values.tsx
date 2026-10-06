"use client";

import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT14 } from "../ctx";
import { formatStat, parseStat, type Stat } from "../lib";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Made to last", desc: "What sets your products apart." },
  { title: "Honest materials", desc: "Keep each point short and concrete." },
  { title: "Clear fit", desc: "One or two short sentences." },
];

const DURATION = 1200;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** A stat that counts up from 0 once when it scrolls into view. Server and reduced-motion render the final value. */
function CountUp({ stat, title }: { stat: Stat; title: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatStat(stat, stat.value);
  const [text, setText] = useState(final);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION);
          setText(formatStat(stat, stat.value * easeOutCubic(p)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        setText(formatStat(stat, 0));
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [stat]);

  return (
    <>
      <span ref={ref} className="t14-stats-num" aria-hidden="true">
        {text}
      </span>
      <span className="t14-sr">{title}</span>
    </>
  );
}

/** Values as glass stat tiles on a dark photo band; a number-led title counts up on reveal. */
export default function T14Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const { photos } = useT14();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  const bg = photos[1]?.url ?? null;
  const lead = (section.items?.[0]?.desc ?? "").replace(/\s+/g, " ").trim();

  return (
    <section className="t14-stats t14-band" data-photo={!!bg} aria-labelledby={`t14-stats-h-${sectionIndex ?? 0}`}>
      {bg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="t14-stats-bg" src={bg} alt="" loading="lazy" />
          <div className="t14-stats-shade" aria-hidden="true" />
        </>
      ) : null}
      <div className="t14-stats-inner">
        <header className="t14-stats-head t14-reveal">
          <h2 id={`t14-stats-h-${sectionIndex ?? 0}`} className="t14-h2">
            Why people shop with us.
          </h2>
          {lead ? <p className="t14-stats-lead">{lead}</p> : null}
        </header>

        <ul className="t14-stats-grid">
          {items.map((it, idx) => {
            const title = it.title ?? "";
            const stat = enabled ? null : parseStat(title);
            const [label, ...rest] = (it.desc ?? "").split(/\r?\n/);
            const sub = rest.join(" ").trim();
            return (
              <li key={idx} className="t14-stats-tile t14-reveal" style={{ ["--d" as string]: idx % 4 }}>
                {stat ? (
                  <CountUp stat={stat} title={title} />
                ) : (
                  <EditableText
                    as="h3"
                    className={parseStat(title) ? "t14-stats-num" : "t14-stats-title"}
                    value={title}
                    placeholder={HINTS[idx % HINTS.length].title}
                    onCommit={(next) => setItem("items", items, idx, { title: next })}
                  />
                )}
                {enabled ? (
                  <EditableText
                    as="p"
                    className="t14-stats-label"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : (
                  <>
                    {label?.trim() ? <p className="t14-stats-label">{label.trim()}</p> : null}
                    {sub ? <p className="t14-stats-sub">{sub}</p> : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
