import type { ReactElement } from "react";

type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.6V17a3 3 0 0 1-3 3A15 15 0 0 1 2 7a3 3 0 0 1 3-3Z" />
  </svg>
);

export const IconMail = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" />
    <path d="m4 7 8 6 8-6" />
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
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const IconClose = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M5 5l14 14M19 5 5 19" />
  </svg>
);

export const IconPlus = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m4 12 5 5L20 6" />
  </svg>
);

export const IconShield = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3 4 6v6c0 4.6 3.4 8 8 9 4.6-1 8-4.4 8-9V6l-8-3Z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);

export const IconBadge = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="9" r="6" />
    <path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7" />
  </svg>
);

/** Hard hat — the default brand mark. */
export const IconHelmet = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M3 17h18M5 17v-3a7 7 0 0 1 14 0v3M10 7.5V5h4v2.5M12 8v5" />
  </svg>
);

export const IconStar = ({ size = 16 }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8L12 2.8Z" />
  </svg>
);

export const IconQuote = ({ size = 34 }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M4 18v-5.5C4 8.4 6.2 6 10 5.5V8c-2 .5-3 1.8-3 4h3v6H4Zm10 0v-5.5c0-4.1 2.2-6.5 6-7V8c-2 .5-3 1.8-3 4h3v6h-6Z" />
  </svg>
);

/* ---------- Trade icons for service tiles ---------- */

const IconHammer = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M14 4h5l2 3-4 1-1.5-1.5L6 17l-2-2 9.5-9.5L14 4Z" />
    <path d="m9 14 6 6" />
  </svg>
);

const IconBolt = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

const IconDrop = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3s6 6.7 6 11a6 6 0 0 1-12 0c0-4.3 6-11 6-11Z" />
    <path d="M9 14a3 3 0 0 0 3 3" />
  </svg>
);

const IconRoller = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="15" height="5" />
    <path d="M18 5.5h3V11h-9v3M10 14h4v7h-4z" />
  </svg>
);

const IconRoof = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M2 12 12 4l10 8M5 10v10h14V10M10 20v-6h4v6" />
  </svg>
);

const IconRuler = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M3 16 16 3l5 5L8 21l-5-5Z" />
    <path d="m7 12 2 2M10 9l2 2M13 6l2 2" />
  </svg>
);

const IconTap = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M4 9h9a4 4 0 0 1 4 4v2M8 9V6M5 6h6M17 18v.5M17 21v.5" />
  </svg>
);

const IconTiles = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M3 12h18M12 3v18" />
  </svg>
);

const IconFan = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-3 3M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-3M12 14c0 4-1 7-4 7-2 0-3-2-1-4l3-3M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 3" />
  </svg>
);

const IconLeaf = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15M5 19l7-7" />
  </svg>
);

const IconWrench = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M15 3a5 5 0 0 0-4.6 6.9L3 17.3 6.7 21l7.4-7.4A5 5 0 0 0 21 9l-3 3-3-3 3-3a5 5 0 0 0-3-3Z" />
  </svg>
);

const TRADE_ICONS: Array<[RegExp, (p: P) => ReactElement]> = [
  [/electric|wiring|light|solar|power|socket|rewir/i, IconBolt],
  [/plumb|pipe|leak|boiler|water|drain|heat/i, IconDrop],
  [/paint|decor|plaster|finish/i, IconRoller],
  [/roof|gutter|loft|extension|new build|build|construct/i, IconRoof],
  [/kitchen|bath|toilet|shower/i, IconTap],
  [/tile|tiling|floor|paving/i, IconTiles],
  [/air|hvac|cool|ventil/i, IconFan],
  [/garden|landscap|fenc|outdoor/i, IconLeaf],
  [/design|plan|survey|architect|draw|estimat/i, IconRuler],
  [/carpent|joiner|wood|renovat|refurb|repair/i, IconHammer],
];

/** Picks a trade icon from the service title ("Electrical rewiring" → bolt), else a wrench. */
export function TradeIcon({ title, size = 28 }: { title: string; size?: number }) {
  const Icon = TRADE_ICONS.find(([re]) => re.test(title))?.[1] ?? IconWrench;
  return <Icon size={size} />;
}

/** Diagonal orange/black hazard stripe (decorative). */
export function Hazard({ className }: { className?: string }) {
  return <span className={`t12-hazard ${className ?? ""}`} aria-hidden="true" />;
}
