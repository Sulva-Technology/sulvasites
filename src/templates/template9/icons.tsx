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
  <svg {...base(size)} strokeLinejoin="round">
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
  <svg {...base(size)} strokeLinejoin="round">
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const IconClock = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconChat = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeLinejoin="round">
    <path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7L4 19.5Z" />
  </svg>
);

export const IconMenu = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M3 7h18M3 12h18M3 17h12" />
  </svg>
);

export const IconClose = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconPlus = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.6}>
    <path d="m4.5 12.5 4.5 4.5L19.5 7" />
  </svg>
);

/** Brand mark: a lightning bolt. */
export const IconBolt = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.7L13.5 2Z" />
  </svg>
);

export const IconStar = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2 2.4 7.6H22l-6.2 4.6 2.4 7.6L12 17.2l-6.2 4.6 2.4-7.6L2 9.6h7.6L12 2Z" />
  </svg>
);

export const IconDumbbell = ({ size = 40 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
);
