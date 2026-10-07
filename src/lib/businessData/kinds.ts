// Relative imports (not "@/") so the Node test runner can load this module.
import { categoryForTemplate, type PhotoCategory } from "../stockPhotos.ts";
import type { BusinessKind } from "./types.ts";

export type SectionTarget = "services" | "team" | "use_cases";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "time" | "image" | "images" | "tags";
  max?: number;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  /** images: max count. */
  maxItems?: number;
};

export type KindDef = {
  kind: BusinessKind;
  /** "Dish" -> "Add dish". */
  singular: string;
  /** Page / card title: "Menu". */
  plural: string;
  blurb: string;
  emptyHint: string;
  nameLabel: string;
  namePlaceholder: string;
  /** null = this kind has no price. */
  priceLabel: string | null;
  /** Label of the on/off switch. */
  activeLabel: string;
  inactiveBadge: string;
  fields: FieldDef[];
  /** Which existing section type the public site fills with these items. */
  target: SectionTarget;
  /** Field whose value groups the list (menu categories). */
  groupBy?: string;
  /** Kept sorted by day/time instead of manual order. */
  autoSort?: boolean;
  /** Photo field whose URLs also feed the gallery sections. */
  galleryFrom?: "photo" | "photos";
};

export const DAYS = [
  { value: "mon", label: "Monday", short: "Mon" },
  { value: "tue", label: "Tuesday", short: "Tue" },
  { value: "wed", label: "Wednesday", short: "Wed" },
  { value: "thu", label: "Thursday", short: "Thu" },
  { value: "fri", label: "Friday", short: "Fri" },
  { value: "sat", label: "Saturday", short: "Sat" },
  { value: "sun", label: "Sunday", short: "Sun" },
] as const;

export const DIETARY = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "gluten_free", label: "Gluten free" },
  { value: "spicy", label: "Spicy" },
  { value: "contains_nuts", label: "Contains nuts" },
] as const;

export const PROJECT_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "available", label: "Available" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
] as const;

const STATUS_BUILD = ["planned", "ongoing", "completed"];
const STATUS_PROPERTY = ["available", "under_offer", "sold"];

const opts = (all: ReadonlyArray<{ value: string; label: string }>, only?: string[]) =>
  all.filter((o) => !only || only.includes(o.value)).map((o) => ({ value: o.value, label: o.label }));

const BASE: Record<BusinessKind, KindDef> = {
  menu_item: {
    kind: "menu_item",
    singular: "Dish",
    plural: "Menu",
    blurb: "Dishes and drinks with prices, photos and dietary tags.",
    emptyHint: "Add your first dish, or import what is already on your website.",
    nameLabel: "Dish name",
    namePlaceholder: "Jollof rice with grilled chicken",
    priceLabel: "Price (₦)",
    activeLabel: "Available",
    inactiveBadge: "Unavailable",
    target: "services",
    groupBy: "category",
    galleryFrom: "photo",
    fields: [
      { key: "category", label: "Menu section", type: "text", max: 60, placeholder: "Starters, Mains, Drinks…", help: "Dishes with the same section are grouped together." },
      { key: "description", label: "Description", type: "textarea", max: 500 },
      { key: "photo", label: "Photo", type: "image" },
      { key: "dietary", label: "Dietary tags", type: "tags", options: opts(DIETARY) },
    ],
  },
  timetable_slot: {
    kind: "timetable_slot",
    singular: "Class",
    plural: "Timetable",
    blurb: "Weekly classes, sessions or services with day, time and instructor.",
    emptyHint: "Add your first class, or import what is already on your website.",
    nameLabel: "Class name",
    namePlaceholder: "Morning spin",
    priceLabel: null,
    activeLabel: "Running",
    inactiveBadge: "Paused",
    target: "services",
    autoSort: true,
    fields: [
      { key: "day", label: "Day", type: "select", required: true, options: opts(DAYS) },
      { key: "start", label: "Starts", type: "time", required: true },
      { key: "end", label: "Ends", type: "time" },
      { key: "instructor", label: "Instructor", type: "text", max: 80 },
      { key: "description", label: "Description", type: "textarea", max: 300 },
    ],
  },
  doctor: {
    kind: "doctor",
    singular: "Doctor",
    plural: "Doctors",
    blurb: "Your practitioners with specialty, bio, photo and consultation fee.",
    emptyHint: "Add your first doctor, or import the team from your website.",
    nameLabel: "Full name",
    namePlaceholder: "Dr Ada Obi",
    priceLabel: "Consultation fee (₦, optional)",
    activeLabel: "Shown on website",
    inactiveBadge: "Hidden",
    target: "team",
    fields: [
      { key: "specialty", label: "Specialty", type: "text", max: 100, placeholder: "Dentist" },
      { key: "bio", label: "Short bio", type: "textarea", max: 800 },
      { key: "photo", label: "Photo", type: "image" },
    ],
  },
  service: {
    kind: "service",
    singular: "Service",
    plural: "Services",
    blurb: "What you offer, with a short description and optional price.",
    emptyHint: "Add your first service, or import the list from your website.",
    nameLabel: "Service name",
    namePlaceholder: "Teeth cleaning",
    priceLabel: "Price (₦, optional)",
    activeLabel: "Shown on website",
    inactiveBadge: "Hidden",
    target: "services",
    fields: [
      { key: "description", label: "Description", type: "textarea", max: 500 },
      { key: "duration", label: "How long it takes", type: "text", max: 60, placeholder: "45 minutes" },
    ],
  },
  programme: {
    kind: "programme",
    singular: "Programme",
    plural: "Programmes",
    blurb: "Courses and programmes with duration and fees.",
    emptyHint: "Add your first programme, or import the list from your website.",
    nameLabel: "Programme name",
    namePlaceholder: "Junior secondary",
    priceLabel: "Fee (₦)",
    activeLabel: "Open for enrolment",
    inactiveBadge: "Closed",
    target: "services",
    fields: [
      { key: "duration", label: "Duration", type: "text", max: 60, placeholder: "3 years" },
      { key: "description", label: "Description", type: "textarea", max: 600 },
    ],
  },
  package: {
    kind: "package",
    singular: "Package",
    plural: "Packages",
    blurb: "Bookable packages with price and what is included.",
    emptyHint: "Add your first package, or import the list from your website.",
    nameLabel: "Package name",
    namePlaceholder: "Gold wedding package",
    priceLabel: "Price (₦)",
    activeLabel: "Available",
    inactiveBadge: "Unavailable",
    target: "services",
    fields: [
      { key: "duration", label: "Duration", type: "text", max: 60, placeholder: "1 day" },
      { key: "description", label: "What is included", type: "textarea", max: 600 },
    ],
  },
  project: {
    kind: "project",
    singular: "Project",
    plural: "Projects",
    blurb: "Finished and ongoing jobs with location, status and photos.",
    emptyHint: "Add your first project, or import the list from your website.",
    nameLabel: "Project title",
    namePlaceholder: "Four-bedroom duplex, Lekki",
    priceLabel: null,
    activeLabel: "Shown on website",
    inactiveBadge: "Hidden",
    target: "use_cases",
    galleryFrom: "photos",
    fields: [
      { key: "location", label: "Location", type: "text", max: 120, placeholder: "Lekki, Lagos" },
      { key: "status", label: "Status", type: "select", options: opts(PROJECT_STATUSES, STATUS_BUILD) },
      { key: "description", label: "Description", type: "textarea", max: 600 },
      { key: "photos", label: "Photos", type: "images", maxItems: 6 },
    ],
  },
};

/** Which managers each photo category (derived from the template) offers, in display order. */
const KINDS_BY_CATEGORY: Partial<Record<PhotoCategory, BusinessKind[]>> = {
  food: ["menu_item"],
  clinic: ["doctor", "service"],
  fitness: ["timetable_slot"],
  education: ["programme"],
  events: ["package"],
  construction: ["project", "service"],
  real_estate: ["project"],
  beauty: ["service"],
  corporate: ["service"],
  creative: ["project", "service"],
  tech: ["service"],
  logistics: ["service"],
  automotive: ["project", "service"],
  general: ["service"],
  // fashion / retail: shop templates, products are managed in the Shop tab.
};

type Override = Partial<
  Pick<
    KindDef,
    "singular" | "plural" | "blurb" | "nameLabel" | "namePlaceholder" | "priceLabel" | "emptyHint" | "activeLabel" | "inactiveBadge"
  >
> & { statuses?: string[] };

const OVERRIDES: Partial<Record<PhotoCategory, Partial<Record<BusinessKind, Override>>>> = {
  automotive: {
    project: {
      singular: "Car",
      plural: "Inventory",
      blurb: "Cars for sale with location, status, price and photos.",
      emptyHint: "Add your first car, or import the list from your website.",
      nameLabel: "Car (make, model, year)",
      namePlaceholder: "1967 Ford Mustang Fastback",
      priceLabel: "Price (₦, optional)",
      activeLabel: "Listed",
      inactiveBadge: "Unlisted",
      statuses: STATUS_PROPERTY,
    },
    service: {
      namePlaceholder: "Full detail & ceramic coat",
      blurb: "Servicing, restoration, detailing and other work, with optional price.",
    },
  },
  real_estate: {
    project: {
      singular: "Property",
      plural: "Properties",
      blurb: "Properties for sale or rent with location, status, price and photos.",
      emptyHint: "Add your first property, or import the list from your website.",
      nameLabel: "Property title",
      namePlaceholder: "Three-bedroom flat, Yaba",
      priceLabel: "Price (₦, optional)",
      activeLabel: "Listed",
      inactiveBadge: "Unlisted",
      statuses: STATUS_PROPERTY,
    },
  },
  creative: {
    project: {
      singular: "Work",
      plural: "Work",
      blurb: "Selected pieces and case studies with photos.",
      nameLabel: "Title",
      namePlaceholder: "Brand film for Acme",
      emptyHint: "Add your first piece of work, or import it from your website.",
    },
  },
  beauty: {
    service: {
      plural: "Services & prices",
      blurb: "Your price list: treatments with price and duration.",
      emptyHint: "Add your first treatment, or import your price list from your website.",
    },
  },
  clinic: {
    service: {
      singular: "Treatment",
      plural: "Treatments",
      nameLabel: "Treatment name",
      blurb: "Treatments and services with price and duration.",
    },
  },
};

export function kindsForCategory(category: PhotoCategory): BusinessKind[] {
  return KINDS_BY_CATEGORY[category] ?? [];
}

/** Manager kinds a template offers (empty for shop templates). */
export function kindsForTemplate(templateKey: string | null | undefined): BusinessKind[] {
  return kindsForCategory(categoryForTemplate(templateKey));
}

/** The kind definition with category-specific wording / status choices applied. */
export function kindDef(kind: BusinessKind, category: PhotoCategory): KindDef {
  const base = BASE[kind];
  const o = OVERRIDES[category]?.[kind];
  if (!o) return base;
  const { statuses, ...text } = o;
  const def: KindDef = { ...base, ...text };
  if (statuses) {
    def.fields = base.fields.map((f) =>
      f.key === "status" ? { ...f, options: opts(PROJECT_STATUSES, statuses) } : f,
    );
  }
  return def;
}

export function kindDefForTemplate(kind: BusinessKind, templateKey: string | null | undefined): KindDef {
  return kindDef(kind, categoryForTemplate(templateKey));
}

/** True when `kind` is one of the managers this template offers. */
export function templateOffersKind(templateKey: string | null | undefined, kind: string): kind is BusinessKind {
  return (kindsForTemplate(templateKey) as string[]).includes(kind);
}
