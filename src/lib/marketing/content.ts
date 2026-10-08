// Marketing copy. Pure: relative imports only.
import { DOMAIN_ADDONS, TRIAL_DAYS, formatNaira, promoEndLabel } from "./pricing.ts";

export type Feature = { title: string; body: string };
export type Faq = { q: string; a: string };

export const SHOWCASE_KEYS = ["t5", "t7", "t13", "t1", "t15", "t16"] as const;

export const TEMPLATE_GROUPS: Array<{ id: string; label: string; keys: string[] }> = [
  { id: "services", label: "Services", keys: ["t1", "t5", "t8", "t9", "t12"] },
  { id: "food-shops", label: "Food & shops", keys: ["t7", "t13", "t14"] },
  { id: "creative", label: "Creative & writing", keys: ["t2", "t3", "t17"] },
  { id: "product", label: "Product & startup", keys: ["t4"] },
  { id: "property-auto", label: "Property & auto", keys: ["t6", "t15"] },
  { id: "community", label: "Community, events & learning", keys: ["t10", "t11", "t16"] },
];

export const FEATURES: Feature[] = [
  { title: "Your own dashboard", body: "Edit pages, photos and prices from your phone. No developer needed." },
  { title: "Enquiries in one inbox", body: "Contact and booking forms land in your inbox with an email alert." },
  { title: "Sell online", body: "Products, cart and checkout with Paystack cards or WhatsApp orders." },
  { title: "A blog on every site", body: "Share news and tips that help customers find you on Google." },
  { title: "Ask AI", body: "Describe a change in plain words and watch your site update." },
  { title: "Light and dark looks", body: "Seventeen designs made for Nigerian businesses, each with its own style." },
];

export const HOW_IT_WORKS: { diy: string[]; dfy: string[] } = {
  diy: [
    "Tell us your business name and what you do.",
    "Pick a design. We write your pages and put the site live.",
    `Make it yours for ${TRIAL_DAYS} days free, then pick a plan.`,
  ],
  dfy: [
    "Send us a short brief or chat on WhatsApp.",
    "We design, write and set up everything for you.",
    "You approve it, we launch, and you run it from your dashboard.",
  ],
};

const com = DOMAIN_ADDONS.find((d) => d.tld === ".com")!;
const ng = DOMAIN_ADDONS.find((d) => d.tld === ".com.ng")!;

export const HOME_FAQ: Faq[] = [
  { q: "Do I need a card for the free trial?", a: `No. You get ${TRIAL_DAYS} days free with no card. Add one only when you decide to keep your site.` },
  { q: "Can I use my own domain?", a: `Yes, on Business and Commerce. Don't have one? We can buy and manage it for you: ${formatNaira(com.yearly)}/yr for .com, ${formatNaira(ng.yearly)}/yr for .com.ng.` },
  { q: "Can you build it for me?", a: "Yes. Choose “Have us build it”, send a short brief, and our team sets everything up." },
  { q: "What happens to launch pricing?", a: `Sign up before ${promoEndLabel()} and you keep the launch price for as long as you stay subscribed.` },
];

export const PRICING_FAQ: Faq[] = [
  { q: "What happens when my trial ends?", a: `After ${TRIAL_DAYS} days your site pauses until you pick a plan. Nothing is deleted, and paying brings it back instantly.` },
  { q: "If I pay early, do I lose trial days?", a: "No. Unused trial days are added before your first paid month starts." },
  { q: "Can I cancel?", a: "Yes, any time from your dashboard. Your site stays live until the end of the period you paid for." },
  { q: "Is the launch price really for life?", a: `Yes. Subscribe before ${promoEndLabel()} and your price doesn't go up while your subscription stays active.` },
  { q: "Why is there a setup fee for done-for-you?", a: "It covers our team writing your content, preparing photos and setting everything up. Doing it yourself has no setup fee." },
  { q: "How does the domain add-on work?", a: `We buy the domain in your business name, connect it and renew it every year: ${formatNaira(com.yearly)}/yr for .com, ${formatNaira(ng.yearly)}/yr for .com.ng.` },
];
