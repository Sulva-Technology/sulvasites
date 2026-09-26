type P = { size?: number };

const s = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconBolt = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);
export const IconLayers = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);
export const IconClock = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconShield = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconChart = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconSpark = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </svg>
);
export const IconCheck = ({ size = 16 }: P) => (
  <svg {...s(size)}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const IconArrow = ({ size = 18 }: P) => (
  <svg {...s(size)} className="t4-arrow">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconMenu = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconMail = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
export const IconPhone = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);
export const IconChat = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </svg>
);
export const IconPin = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const FEATURE_ICONS = [IconBolt, IconLayers, IconClock, IconShield, IconChart, IconSpark];
