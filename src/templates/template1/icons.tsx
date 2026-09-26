type P = { size?: number };

const s = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconBriefcase = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
  </svg>
);
export const IconCompass = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </svg>
);
export const IconTrend = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
  </svg>
);
export const IconUsers = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
  </svg>
);
export const IconShield = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
  </svg>
);
export const IconDoc = ({ size = 22 }: P) => (
  <svg {...s(size)}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" />
  </svg>
);
export const IconCheck = ({ size = 14 }: P) => (
  <svg {...s(size)} strokeWidth={2.4}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const IconArrow = ({ size = 18 }: P) => (
  <svg {...s(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconArrowLeft = ({ size = 18 }: P) => (
  <svg {...s(size)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const IconMenu = ({ size = 20 }: P) => (
  <svg {...s(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconPlus = ({ size = 14 }: P) => (
  <svg {...s(size)} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
/** Abstract building line mark used when there's no hero photo. */
export const IconSkyline = () => (
  <svg viewBox="0 0 300 200" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M10 190V90h60v100M70 190V40h70v150M140 190V110h50v80M190 190V60h90v130" />
    <path d="M85 60h40M85 80h40M85 100h40M85 120h40M85 140h40M205 80h60M205 100h60M205 120h60M205 140h60M25 110h30M25 130h30" />
  </svg>
);

export const SERVICE_ICONS = [IconBriefcase, IconCompass, IconTrend, IconUsers, IconShield, IconDoc];
