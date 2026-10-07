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
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconChevron = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconStar = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </svg>
);

export const IconQuote = ({ size = 40 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false}>
    <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5V13a2 2 0 0 0 2 2h2.2c-.2 1.6-1 2.6-2.7 3.2l.6 1.8C9 19 10 16.8 10 13.6V7Zm10 0h-3.5A2.5 2.5 0 0 0 14 9.5V13a2 2 0 0 0 2 2h2.2c-.2 1.6-1 2.6-2.7 3.2l.6 1.8C19 19 20 16.8 20 13.6V7Z" />
  </svg>
);

/** Brand mark when there's no logo: two interlocking circles. */
export const IconCircles = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="9.5" cy="12" r="5.5" />
    <circle cx="14.5" cy="12" r="5.5" />
  </svg>
);

/** Stat-band icons, one per position (people, globe, heart, star). */
export function StatIcon({ index, size = 22 }: { index: number; size?: number }) {
  switch (index % 4) {
    case 0:
      return (
        <svg {...base(size)}>
          <circle cx="9" cy="8.5" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
        </svg>
      );
    case 1:
      return (
        <svg {...base(size)}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5Z" />
        </svg>
      );
    case 2:
      return (
        <svg {...base(size)}>
          <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
        </svg>
      );
    default:
      return (
        <svg {...base(size)}>
          <path d="m12 3.5 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3.5Z" />
        </svg>
      );
  }
}

/** Department / service icon picked from the title (wellness, content, design, prayer, outreach…). */
export function ServiceIcon({ title, size = 22 }: { title: string; size?: number }) {
  const t = title.toLowerCase();
  if (/(health|well|fitness|care|counsel|mental)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
        <path d="M7.5 12.5h2.2l1.3-2.5 2 4 1.3-1.5h2.2" />
      </svg>
    );
  }
  if (/(content|media|writ|blog|podcast|comms|communication|story)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M7 3.5h7l4.5 4.5v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z" />
        <path d="M13.5 3.5V8h4.5M9 12.5h6M9 16h6" />
      </svg>
    );
  }
  if (/(design|creative|art|brand|music|worship|choir)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.8 0-1 .8-1.7 1.8-1.7h2.1a3.8 3.8 0 0 0 3.8-3.8c0-4-3.8-7-8.5-7Z" />
        <circle cx="8" cy="11" r="1" />
        <circle cx="11" cy="7.5" r="1" />
        <circle cx="15.5" cy="8.5" r="1" />
      </svg>
    );
  }
  if (/(pray|faith|bible|spirit|devot|fellowship|church|ministry)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Z" />
        <path d="M12 8v6M9.5 10.5h5" />
      </svg>
    );
  }
  if (/(mentor|coach|lead|train|class|learn|school|academy|masterclass)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="m3 9 9-4.5L21 9l-9 4.5L3 9Z" />
        <path d="M7 11v4.5c1.4 1.3 3 2 5 2s3.6-.7 5-2V11M21 9v5" />
      </svg>
    );
  }
  if (/(outreach|volunt|serv|charity|give|commun|welfare|support)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M3.5 13.5 7 10l3 1.5h3.5a1.5 1.5 0 0 1 0 3H10M3.5 19.5l3-2h7l6-5a1.5 1.5 0 0 0-2-2.2l-3.5 2.7" />
      </svg>
    );
  }
  if (/(business|ceo|entrepreneur|career|finance|innovat|tech|lab)/.test(t)) {
    return (
      <svg {...base(size)}>
        <path d="M12 3.5c3 2.2 4.5 5.2 4.5 9l-2 2.5h-5l-2-2.5c0-3.8 1.5-6.8 4.5-9Z" />
        <circle cx="12" cy="10" r="1.6" />
        <path d="M9.5 15 7 18.5h3M14.5 15l2.5 3.5h-3M12 17v3.5" />
      </svg>
    );
  }
  // Default: a compass.
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}
