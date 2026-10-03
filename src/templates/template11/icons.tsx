import type { CSSProperties } from "react";

type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconArrowLeft = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const IconArrowUpRight = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.6V17a3 3 0 0 1-3 3A15 15 0 0 1 2 7a3 3 0 0 1 3-3Z" />
  </svg>
);

export const IconMail = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7.5 8 5.5 8-5.5" />
  </svg>
);

export const IconPin = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.6" />
  </svg>
);

export const IconChat = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" />
  </svg>
);

export const IconClock = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconMenu = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export const IconClose = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconPlus = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCalendar = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconSparkle = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 1.8c.5 4.9 2.9 8.2 9.2 10.2-6.3 2-8.7 5.3-9.2 10.2-.5-4.9-2.9-8.2-9.2-10.2C9.1 10 11.5 6.7 12 1.8Z" />
  </svg>
);

export const IconTicket = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" />
    <path d="M14 6.5v11" strokeDasharray="1.6 2.2" />
  </svg>
);

export const IconGlass = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3ZM12 14v6M8.5 21h7M7.4 7h9.2" />
  </svg>
);

export const IconQuote = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 6.5C6.6 7.4 4 10.2 4 14v3.5h6V12H7.2c.4-1.8 1.6-3 3.3-3.6L10 6.5Zm10 0c-3.4.9-6 3.7-6 7.5v3.5h6V12h-2.8c.4-1.8 1.6-3 3.3-3.6L20 6.5Z" />
  </svg>
);

export const IconStar = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </svg>
);

/* ---------- Decorative layers (CSS-only shapes, hidden from assistive tech) ---------- */

// [left %, top %, size px, tone 0–3, shape: dot | bar | ring]
type Bit = [number, number, number, number, "d" | "b" | "r"];

const CONFETTI: Record<"hero" | "band" | "card", Bit[]> = {
  hero: [
    [6, 18, 12, 0, "d"], [14, 64, 9, 1, "b"], [21, 30, 7, 2, "d"], [9, 84, 14, 3, "r"],
    [30, 10, 8, 1, "d"], [38, 88, 10, 0, "b"], [62, 8, 9, 3, "d"], [70, 90, 8, 1, "d"],
    [78, 22, 13, 2, "r"], [86, 58, 9, 0, "b"], [93, 14, 8, 1, "d"], [91, 80, 11, 3, "d"],
    [50, 4, 7, 2, "d"], [3, 46, 8, 1, "b"], [97, 40, 7, 0, "d"], [56, 94, 12, 3, "r"],
  ],
  band: [
    [5, 20, 10, 1, "d"], [12, 74, 8, 3, "b"], [26, 14, 7, 0, "d"], [44, 86, 9, 1, "r"],
    [68, 12, 8, 3, "d"], [82, 70, 10, 1, "b"], [94, 26, 9, 0, "d"], [90, 88, 7, 3, "d"],
  ],
  card: [
    [8, 12, 8, 1, "d"], [88, 16, 9, 3, "b"], [92, 78, 10, 0, "r"], [6, 86, 7, 3, "d"], [48, 6, 6, 1, "d"],
  ],
};

/** Scattered CSS confetti dots, bars and rings (decorative). */
export function Confetti({ set = "hero", className }: { set?: keyof typeof CONFETTI; className?: string }) {
  return (
    <span className={`t11-confetti ${className ?? ""}`} aria-hidden="true">
      {CONFETTI[set].map(([x, y, s, tone, shape], i) => (
        <i
          key={i}
          data-tone={tone}
          data-shape={shape}
          style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${s}px`, "--d": `${(i % 5) * -1.3}s` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** Soft violet / peach / pink gradient-mesh blobs (radial gradients, no images). */
export function Mesh({ className }: { className?: string }) {
  return (
    <span className={`t11-mesh ${className ?? ""}`} aria-hidden="true">
      <i className="t11-blob t11-blob-a" />
      <i className="t11-blob t11-blob-b" />
      <i className="t11-blob t11-blob-c" />
    </span>
  );
}

/** Faux barcode for ticket stubs (decorative). */
const BARS = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2].reduce<Array<[number, number]>>(
  (acc, w) => {
    const prev = acc[acc.length - 1];
    acc.push([prev ? prev[0] + prev[1] + 0.6 : 0, w]);
    return acc;
  },
  [],
);

export function Barcode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 45.4 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {BARS.map(([x, w], i) => (i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="24" fill="currentColor" /> : null))}
    </svg>
  );
}
