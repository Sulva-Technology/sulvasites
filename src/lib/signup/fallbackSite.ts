// Signup wizard answers → validated input, AI brief, or personalised sample content. Pure: relative imports only.
import type { PageData } from "../pageSchema.ts";
import type { SiteProfile } from "../ai/siteBuilder.ts";
import { emptyBrief, type Brief } from "../ai/brief.ts";
import { normalizePhoneNg } from "../billing/identity.ts";
import { isInterval, isTier, type Interval, type Tier } from "../marketing/pricing.ts";
import { colorWordsToChoice, expandPalette, type ColorChoice } from "../ai/setupPalette.ts";
import { applyDetailsToBrief, applyDetailsToPages, parseDetails, type ParsedDetails } from "./ownerDetails.ts";

export type SignupAnswers = { businessName: string; whatTheyDo: string; city: string; whatsapp: string; sellOnline: boolean };
export type SignupBody = {
  answers: SignupAnswers;
  templateKey: string;
  tier: Tier;
  interval: Interval;
  /** What the owner pasted from their own AI (optional). */
  details: ParsedDetails;
  /** Colours pulled from the uploaded logo (or tweaked by hand); null = template default. */
  color: ColorChoice | null;
};

const HEX = /^#[0-9a-f]{6}$/i;

function parseColor(v: unknown): ColorChoice | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (typeof c.accent !== "string" || typeof c.accent2 !== "string" || !HEX.test(c.accent) || !HEX.test(c.accent2)) return null;
  return { accent: c.accent, accent2: c.accent2, source: c.source === "custom" ? "custom" : "logo" };
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function parseSignupBody(body: unknown, isKey: (k: string) => boolean): { ok: true; value: SignupBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  const a = (b.answers && typeof b.answers === "object" ? b.answers : {}) as Record<string, unknown>;
  const businessName = text(a.businessName, 80);
  const whatTheyDo = text(a.whatTheyDo, 160);
  const city = text(a.city, 60);
  if (businessName.length < 2) return { ok: false, error: "Enter your business name." };
  if (whatTheyDo.length < 3) return { ok: false, error: "Tell us what your business does." };
  if (city.length < 2) return { ok: false, error: "Enter your city." };
  const whatsapp = normalizePhoneNg(a.whatsapp);
  if (!whatsapp) return { ok: false, error: "Enter a Nigerian WhatsApp number, e.g. 0803 123 4567." };
  if (typeof b.templateKey !== "string" || !isKey(b.templateKey)) return { ok: false, error: "Pick a design." };
  if (!isTier(b.tier)) return { ok: false, error: "Pick a plan." };
  if (!isInterval(b.interval)) return { ok: false, error: "Pick monthly or yearly." };
  return {
    ok: true,
    value: {
      answers: { businessName, whatTheyDo, city, whatsapp, sellOnline: a.sellOnline === true },
      templateKey: b.templateKey,
      tier: b.tier,
      interval: b.interval,
      details: parseDetails(b.details),
      color: parseColor(b.color),
    },
  };
}

export function briefFromAnswers(a: SignupAnswers, email: string, details: ParsedDetails = { kind: "empty" }): Brief {
  const b = emptyBrief();
  return applyDetailsToBrief({
    ...b,
    businessName: a.businessName,
    whatTheyDo: a.whatTheyDo,
    location: a.city,
    contact: { ...b.contact, whatsapp: a.whatsapp, phone: a.whatsapp, email },
    shopIntent: a.sellOnline,
  }, details);
}

export type TrialBuild = {
  templateKey: string;
  profile: SiteProfile;
  pages: { home: PageData; about: PageData; contact: PageData };
  extraPages: Array<{ key: string; label: string; data: PageData }>;
  /** theme_colors entry for the template (from the logo or the owner's colour words). */
  themeColors?: Record<string, string>;
};

export type SampleLike = {
  profile: { business_name: string };
  pages: { home: PageData; about: PageData; contact: PageData };
};

const enc = (s: string) => JSON.stringify(s).slice(1, -1);

/** Template sample content with the sample business name swapped for the owner's, used when AI is unavailable. */
export function personalizeSample(templateKey: string, sample: SampleLike, a: SignupAnswers, email: string): TrialBuild {
  const from = sample.profile.business_name;
  const json = JSON.stringify(sample.pages);
  const pages = JSON.parse(from ? json.split(enc(from)).join(enc(a.businessName)) : json) as TrialBuild["pages"];
  return {
    templateKey,
    profile: {
      business_name: a.businessName,
      tagline: a.whatTheyDo,
      description: `${a.whatTheyDo} in ${a.city}.`,
      address: a.city,
      phone: a.whatsapp,
      email,
      whatsapp: a.whatsapp,
      socials: { instagram: null, facebook: null, twitter: null, tiktok: null },
    },
    pages,
    extraPages: [],
  };
}

/**
 * Last touches on any trial build (AI or sample): the owner's real reviews, team, FAQs and partners
 * go into the pages, their tagline and contacts into the profile, and logo colours become the theme.
 */
export function finishTrialBuild(build: TrialBuild, details: ParsedDetails, color: ColorChoice | null): TrialBuild {
  let out = build;
  if (details.kind === "json") {
    const d = details.details;
    const all = applyDetailsToPages(
      { ...build.pages, ...Object.fromEntries(build.extraPages.map((e) => [e.key, e.data])) } as Record<string, PageData>,
      d,
      build.templateKey,
    );
    const p = build.profile;
    const c = d.contact;
    out = {
      ...build,
      pages: { home: all.home!, about: all.about!, contact: all.contact! },
      extraPages: build.extraPages.map((e) => ({ ...e, data: all[e.key] ?? e.data })),
      profile: {
        ...p,
        tagline: d.tagline || p.tagline,
        address: d.address || p.address,
        phone: c.phone || p.phone,
        email: c.email || p.email,
        socials: {
          instagram: c.instagram || p.socials.instagram,
          facebook: c.facebook || p.socials.facebook,
          twitter: c.x || p.socials.twitter,
          tiktok: c.tiktok || p.socials.tiktok,
        },
      },
    };
  }
  const choice = color ?? (details.kind === "json" ? colorWordsToChoice(details.details.brandColors) : null);
  return choice ? { ...out, themeColors: expandPalette(build.templateKey, choice) } : out;
}
