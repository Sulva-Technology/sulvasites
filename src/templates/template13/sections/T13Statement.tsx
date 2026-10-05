"use client";

import { useEffect, useRef, useState } from "react";

import { litCount, splitChars } from "../lib";

/** Giant serif sentence whose letters light up as it crosses the viewport (Offloop's closing statement). */
export default function T13Statement({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  const chars = splitChars(text);
  const total = chars.length;
  const [lit, setLit] = useState(total);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      setLit(Number.isFinite(progress) ? litCount(progress, total) : total);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [total]);
  return (
    <section ref={ref} className="t13-section t13-statement" aria-label={text}>
      <p className="t13-container t13-statement-text" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} data-lit={i < lit}>
            {c}
          </span>
        ))}
      </p>
    </section>
  );
}
