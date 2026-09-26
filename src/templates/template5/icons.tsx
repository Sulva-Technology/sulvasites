type P = { size?: number };

const stroke = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconSparkle = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 1.5c.6 4.8 3.6 8.4 9 10.5-5.4 2.1-8.4 5.7-9 10.5-.6-4.8-3.6-8.4-9-10.5 5.4-2.1 8.4-5.7 9-10.5Z" />
  </svg>
);

export const IconInstagram = ({ size = 18 }: P) => (
  <svg {...stroke(size)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const IconCalendar = ({ size = 18 }: P) => (
  <svg {...stroke(size)}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconMenu = ({ size = 20 }: P) => (
  <svg {...stroke(size)}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const IconArrow = ({ size = 16 }: P) => (
  <svg {...stroke(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
