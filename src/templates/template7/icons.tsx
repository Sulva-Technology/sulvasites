type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconFlame = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.6 3.8-8.8.5 1.6 1.4 2.6 2.4 3 .2-2.6 1.4-4.9 3.4-6 -.3 2.6.9 4.4 2.2 6.2 1 1.4 1.7 3 1.7 5.1C19 18.4 16 21 12 21Z" />
    <path d="M12 21c-1.7 0-2.8-1.1-2.8-2.7 0-1.9 1.7-2.9 2.3-4.6.9 1 3.3 2.5 3.3 4.6 0 1.6-1.1 2.7-2.8 2.7Z" />
  </svg>
);

export const IconLeaf = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M5 19c0-8 5.5-13.5 15-14-.4 9.6-6 15-14 15" />
    <path d="M4 20 13 11" />
  </svg>
);

export const IconWheat = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21V8" />
    <path d="M12 8c-2.2-.4-3.4-2-3.4-4.4C10.8 4 12 5.6 12 8Zm0 0c2.2-.4 3.4-2 3.4-4.4C13.2 4 12 5.6 12 8Z" />
    <path d="M12 13c-2.4-.2-3.9-1.8-4.2-4.2 2.4.2 3.9 1.8 4.2 4.2Zm0 0c2.4-.2 3.9-1.8 4.2-4.2-2.4.2-3.9 1.8-4.2 4.2Z" />
    <path d="M12 18c-2.4-.2-3.9-1.8-4.2-4.2 2.4.2 3.9 1.8 4.2 4.2Zm0 0c2.4-.2 3.9-1.8 4.2-4.2-2.4.2-3.9 1.8-4.2 4.2Z" />
  </svg>
);

export const IconPot = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5Z" />
    <path d="M2 10h2M20 10h2M9 4c-.6.8-.6 1.7 0 2.5M12 3c-.6.8-.6 1.7 0 2.5M15 4c-.6.8-.6 1.7 0 2.5" />
  </svg>
);

export const IconHands = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
  </svg>
);

export const IconFish = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M3 12c3-4.5 8-6 12.5-3.6L20 6v12l-4.5-2.4C11 18 6 16.5 3 12Z" />
    <circle cx="8" cy="11" r=".8" fill="currentColor" />
  </svg>
);

export const IconCutlery = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
    <path d="M17 21V3c-2 1-3.2 3.4-3.2 6.5V13H17" />
  </svg>
);

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);

export const IconMail = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const IconPin = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const IconClock = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconChat = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </svg>
);

export const IconPlus = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMenu = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const IconClose = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** Small four-point star used as a typographic ornament. */
export const Ornament = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <path d="M6 0c.4 3.2 2.8 5.6 6 6-3.2.4-5.6 2.8-6 6-.4-3.2-2.8-5.6-6-6 3.2-.4 5.6-2.8 6-6Z" />
  </svg>
);

export const KITCHEN_ICONS = [IconFlame, IconLeaf, IconHands, IconWheat, IconPot, IconFish];
