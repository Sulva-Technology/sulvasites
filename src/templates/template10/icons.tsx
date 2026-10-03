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

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconCap = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m2 9 10-5 10 5-10 5L2 9Z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />
  </svg>
);

export const IconBook = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8M8 11h6" />
  </svg>
);

export const IconPencil = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5ZM13 7l4 4" />
  </svg>
);

export const IconFlask = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10" />
  </svg>
);

export const IconGlobe = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
  </svg>
);

export const IconPalette = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.6 1-2.5 2.5-2.5H18a3 3 0 0 0 3-3C21 7 17 3 12 3Z" />
    <circle cx="7.5" cy="11" r="1.2" />
    <circle cx="10.5" cy="7" r="1.2" />
    <circle cx="15.5" cy="7.5" r="1.2" />
  </svg>
);

export const IconCalc = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="3" width="14" height="18" rx="3" />
    <path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
  </svg>
);

export const IconSpark = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </svg>
);

export const IconQuote = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 6.5C6.6 7.4 4 10.2 4 14v3.5h6V12H7.2c.4-1.8 1.6-3 3.3-3.6L10 6.5Zm10 0c-3.4.9-6 3.7-6 7.5v3.5h6V12h-2.8c.4-1.8 1.6-3 3.3-3.6L20 6.5Z" />
  </svg>
);

export const IconRibbon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="9" r="6" />
    <path d="m8.5 13.8-1.5 7.2 5-2.5 5 2.5-1.5-7.2" />
  </svg>
);

export const IconCalendar = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/** Cycled across programme cards so each gets a friendly subject icon. */
export const SUBJECT_ICONS = [IconBook, IconFlask, IconPalette, IconGlobe, IconCalc, IconPencil];

/** Hand-drawn underline scribble (decorative) — stretched under the highlighted word. */
export const Scribble = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path
      d="M3 13.5C38 6.5 78 4.5 118 7.2c28 1.9 50 4.6 79 1.6M30 16.6c38-3.6 86-4.8 140-1.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.2"
      strokeLinecap="round"
      pathLength={1}
    />
  </svg>
);
