"use client";

import Link from "next/link";
import { useRef } from "react";
import type { KeyboardEvent } from "react";

export type TabItem = { id: string; label: string; href?: string; count?: number };

const base =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange";
const on = "bg-white font-medium text-koi-ink shadow-sm";
const off = "text-koi-ink/60 hover:text-koi-ink";

function Count({ n, active }: { n?: number; active: boolean }) {
  if (n === undefined) return null;
  return (
    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-koi-ink/5 text-koi-ink/70" : "bg-koi-ink/5 text-koi-ink/50"}`}>
      {n}
    </span>
  );
}

/**
 * Segmented pill tabs. Items with `href` render as links (route tabs, a nav);
 * otherwise buttons with role=tab and arrow-key navigation, calling `onChange`.
 */
export function Tabs({
  items,
  active,
  onChange,
  label,
  className = "",
}: {
  items: TabItem[];
  active: string;
  onChange?: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const linkMode = items.length > 0 && items.every((i) => i.href);
  const wrap = `inline-flex max-w-full overflow-x-auto rounded-full bg-koi-ink/5 p-1 ${className}`;

  if (linkMode) {
    return (
      <nav aria-label={label} className={wrap}>
        {items.map((item) => {
          const isOn = item.id === active;
          return (
            <Link key={item.id} href={item.href!} aria-current={isOn ? "page" : undefined} className={`${base} ${isOn ? on : off}`}>
              {item.label}
              <Count n={item.count} active={isOn} />
            </Link>
          );
        })}
      </nav>
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange?.(items[next].id);
  }

  return (
    <div role="tablist" aria-label={label} className={wrap}>
      {items.map((item, index) => {
        const isOn = item.id === active;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isOn}
            tabIndex={isOn ? 0 : -1}
            onClick={() => onChange?.(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`${base} ${isOn ? on : off}`}
          >
            {item.label}
            <Count n={item.count} active={isOn} />
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
