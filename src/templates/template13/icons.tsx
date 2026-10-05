type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 12h15M14 7l5 5-5 5" />
  </svg>
);

export const IconChevron = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconPhone = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.6V17a3 3 0 0 1-3 3A15 15 0 0 1 2 7a3 3 0 0 1 3-3Z" />
  </svg>
);

export const IconMail = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const IconPin = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.4" />
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
    <path d="M4 8h16M4 16h16" />
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

export const IconMinus = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
  </svg>
);

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconBag = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const IconRuler = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="2.5" y="8" width="19" height="8" rx="1" transform="rotate(-20 12 12)" />
    <path d="m8 11.5 1.2 2.4M11 10.4l.8 1.6M14 9.3l1.2 2.4" />
  </svg>
);

export const IconTrash = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);

export const IconHanger = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M12 8V6.6a2 2 0 1 1 2 2M12 8l9 6.5a1.4 1.4 0 0 1-.8 2.5H3.8a1.4 1.4 0 0 1-.8-2.5L12 8Z" />
  </svg>
);

export const IconQuote = ({ size = 28 }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M4 18v-5.5C4 8.4 6.2 6 10 5.5V8c-2 .5-3 1.8-3 4h3v6H4Zm10 0v-5.5c0-4.1 2.2-6.5 6-7V8c-2 .5-3 1.8-3 4h3v6h-6Z" />
  </svg>
);

export const IconAlert = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.2v.1" />
  </svg>
);

export const IconSearch = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const IconArrowUp = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const IconSpark = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={1.6}>
    <path d="M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2L12 3.5Z" />
  </svg>
);
