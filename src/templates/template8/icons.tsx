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
});

export const IconArrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
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
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const IconPin = ({ size = 18 }: P) => (
  <svg {...base(size)}>
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
  <svg {...base(size)}>
    <path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7L4 19.5Z" />
  </svg>
);

export const IconMenu = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M4 12h16M4 17h10" />
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

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconShield = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

export const IconCalendar = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const IconQuote = ({ size = 28 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 6.5C6.5 7.5 4.5 10 4.5 13.6V18h5.3v-5.3H7.4c0-1.9 1.1-3.3 3.2-4L10 6.5Zm9.5 0C16 7.5 14 10 14 13.6V18h5.3v-5.3h-2.4c0-1.9 1.1-3.3 3.2-4l-.6-2.2Z" />
  </svg>
);

export const IconAlert = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);

/** Brand mark: a soft medical cross. */
export const IconCross = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.6 3h4.8a1 1 0 0 1 1 1v5.6H21a1 1 0 0 1 1 1v4.8a1 1 0 0 1-1 1h-5.6V20a1 1 0 0 1-1 1H9.6a1 1 0 0 1-1-1v-3.6H3a1 1 0 0 1-1-1v-4.8a1 1 0 0 1 1-1h5.6V4a1 1 0 0 1 1-1Z" />
  </svg>
);

/* ---------- Service icons ---------- */

export const IconStethoscope = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M6 3v5a5 5 0 0 0 10 0V3" />
    <path d="M11 13v2.5a5 5 0 0 0 10 0V14" />
    <circle cx="21" cy="12" r="2" />
  </svg>
);

export const IconHeartPulse = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
    <path d="M4.5 12h4l1.5-2.5 2.5 5 1.5-2.5h5.5" />
  </svg>
);

export const IconTooth = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M7.5 3.5c-2.6 0-4 2.2-4 4.6 0 2.6 1.4 4.2 2 6.7.6 2.6.8 5.7 2.4 5.7 1.7 0 1.6-4.2 4.1-4.2s2.4 4.2 4.1 4.2c1.6 0 1.8-3.1 2.4-5.7.6-2.5 2-4.1 2-6.7 0-2.4-1.4-4.6-4-4.6-1.8 0-2.8 1-4.5 1s-2.7-1-4.5-1Z" />
  </svg>
);

export const IconBaby = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9 11h.01M15 11h.01M9.5 15a3.5 3.5 0 0 0 5 0M12 3.5c-1 1.3-.6 2.6.8 2.8" />
  </svg>
);

export const IconEye = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconFlask = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M9 3h6M10 3v6L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3" />
    <path d="M7.3 14h9.4" />
  </svg>
);

export const IconSyringe = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="m18 2 4 4M20 4l-4.5 4.5M14 6l4 4M15.5 8.5 7 17H4v-3l8.5-8.5M9.5 11.5l1.5 1.5M7 14l1.5 1.5M4 20l3-3" />
  </svg>
);

export const IconPill = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-45 12 12)" />
    <path d="m8.8 8.8 6.4 6.4" />
  </svg>
);

export const IconWoman = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14v7M9 18h6" />
  </svg>
);

export const IconActivity = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);

export const IconBrain = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M9 4.5A3 3 0 0 0 6 7.2 3 3 0 0 0 4 12a3 3 0 0 0 2 4.8A3 3 0 0 0 9 19.5a2.5 2.5 0 0 0 3-1V5.6a2.5 2.5 0 0 0-3-1.1ZM15 4.5A3 3 0 0 1 18 7.2a3 3 0 0 1 2 4.8 3 3 0 0 1-2 4.8 3 3 0 0 1-3 2.7 2.5 2.5 0 0 1-3-1" />
  </svg>
);

export const IconClipboard = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="3" />
    <path d="M9 3h6v3H9zM9 12h6M9 16h4" />
  </svg>
);

type Icon = (p: P) => React.JSX.Element;

const KEYWORDS: Array<[RegExp, Icon]> = [
  [/dent|tooth|teeth|orthodon|brace|smile|oral/i, IconTooth],
  [/child|kid|paediat|pediat|baby|infant|newborn/i, IconBaby],
  [/eye|vision|optic|optom|ophthal/i, IconEye],
  [/lab|test|screen|scan|diagnos|blood|x-?ray|ultrasound/i, IconFlask],
  [/vaccin|immun|jab|travel/i, IconSyringe],
  [/pharm|prescri|medic(ine|ation)|drug|refill/i, IconPill],
  [/women|maternity|antenatal|prenatal|pregnan|gyn|obstet|fertility/i, IconWoman],
  [/heart|cardio|blood pressure|hypertens/i, IconHeartPulse],
  [/physio|rehab|sport|fitness|exercise|weight|nutrition|diet/i, IconActivity],
  [/mental|therap|counsel|psych|stress|anxiety/i, IconBrain],
  [/check|health check|well(ness)?|annual|corporate|employ|insurance|record/i, IconClipboard],
  [/consult|gp|general|family|doctor|clinic/i, IconStethoscope],
];

const ROTATION: Icon[] = [IconStethoscope, IconHeartPulse, IconClipboard, IconFlask, IconActivity, IconSyringe];

/** Picks a service icon from keywords in its title, falling back to a fixed rotation. */
export function serviceIcon(title: string, idx: number): Icon {
  for (const [re, icon] of KEYWORDS) if (re.test(title)) return icon;
  return ROTATION[idx % ROTATION.length];
}
