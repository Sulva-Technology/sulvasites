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

export const IconTrash = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);

export const IconStore = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0M5.5 12v8h13v-8M10 20v-5h4v5" />
  </svg>
);

export const IconSearch = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconTag = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3.5 12.2V4.5h7.7l9 9a1.5 1.5 0 0 1 0 2.1l-5.6 5.6a1.5 1.5 0 0 1-2.1 0l-9-9Z" />
    <circle cx="8" cy="9" r="1.2" />
  </svg>
);

export const IconFilter = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const IconChevronDown = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconGrid = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
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
