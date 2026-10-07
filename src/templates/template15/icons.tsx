type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
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
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z" />
  </svg>
);

export const IconClock = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
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

export const IconPlus = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconQuote = ({ size = 28 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false}>
    <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5V13a2 2 0 0 0 2 2h2.2c-.2 1.6-1 2.6-2.7 3.2l.6 1.8C9 19 10 16.8 10 13.6V7Zm10 0h-3.5A2.5 2.5 0 0 0 14 9.5V13a2 2 0 0 0 2 2h2.2c-.2 1.6-1 2.6-2.7 3.2l.6 1.8C19 19 20 16.8 20 13.6V7Z" />
  </svg>
);

/** Brand mark when there's no logo: a steering wheel. */
export const IconWheel = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M3.8 10.5c2.6-.9 5.3-1.3 8.2-1.3s5.6.4 8.2 1.3M10.4 13.6 7 19.6M13.6 13.6l3.4 6" />
  </svg>
);

/** Service icon picked from the title (sales, restoration, servicing, detailing, storage, finance…). */
export function ServiceIcon({ title, size = 22 }: { title: string; size?: number }) {
  const t = title.toLowerCase();
  if (/(detail|polish|wash|valet|ceramic|wrap|paint)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M12 3s5 5.6 5 9.5a5 5 0 0 1-10 0C7 8.6 12 3 12 3Z" />
        <path d="M10 13.5a2 2 0 0 0 2 2" />
      </svg>
    );
  }
  if (/(restor|repair|service|servic|mechanic|maint|engine|tune|parts)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M14.5 6.5a4 4 0 0 0-5.3 5.1L4 16.8 7.2 20l5.2-5.2a4 4 0 0 0 5.1-5.3l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2Z" />
      </svg>
    );
  }
  if (/(stor|garage|collect|concierge|transport|ship|import|export|deliver)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M3 10.5 12 5l9 5.5V20H3v-9.5Z" />
        <path d="M7 20v-6h10v6M7 17h10" />
      </svg>
    );
  }
  if (/(financ|loan|lease|trade|valu|apprais|insur|swap|part.?ex)/.test(t)) {
    return (
      <svg {...base(size)}>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    );
  }
  if (/(hire|rent|chauffeur|drive|tour|event|wedding|track)/.test(t)) {
    return (
      <svg {...base(size)}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  // Sales / sourcing / default: a car silhouette.
  return (
    <svg {...base(size)}>
      <path d="M3 15.5V13l2-4.5A2 2 0 0 1 6.8 7.3h10.4A2 2 0 0 1 19 8.5l2 4.5v2.5a1 1 0 0 1-1 1h-1.2M5.2 16.5H4a1 1 0 0 1-1-1M9 16.5h6" />
      <circle cx="7" cy="16.5" r="1.8" />
      <circle cx="17" cy="16.5" r="1.8" />
      <path d="M5 12.5h14" />
    </svg>
  );
}
