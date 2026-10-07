/** Lightweight template descriptions for admin UI (no component imports). */
export type TemplateMeta = {
  key: string;
  name: string;
  category: string;
  description: string;
  /** An e-commerce template: the store is the point of the site (AI template choice treats it as a shop). */
  shop?: boolean;
  /**
   * Optional online ordering on a non-shop template (restaurants): the shop engine, admin and checkout are
   * available, but the AI still treats the business as a regular one when picking a template.
   */
  ordering?: boolean;
  /** A blog-first template: its home page leads with the latest posts (every template can have a blog). */
  blogFirst?: boolean;
};

export const TEMPLATE_META: TemplateMeta[] = [
  { key: "t1", name: "Meridian", category: "Corporate", description: "Consultancies, agencies, clinics and professional services. Crisp fintech look." },
  { key: "t2", name: "Journal", category: "Editorial", description: "Creatives, media, fashion and studios — glossy magazine style." },
  { key: "t3", name: "Atelier", category: "Portfolio", description: "Personal brands, founders, designers and freelancers. Light glass look." },
  { key: "t4", name: "Launch", category: "Product / app", description: "Startups, apps and product launches. Light + dark modes." },
  { key: "t5", name: "Maison", category: "Beauty & booking", description: "Makeup artists, salons, spas and appointment businesses. Light + dark modes." },
  { key: "t6", name: "Estate", category: "Real estate", description: "Agencies, developers and property managers. Catalogue style, light + dark modes." },
  { key: "t7", name: "Tavola", category: "Restaurant", description: "Restaurants, cafés, caterers and bakeries: a sleek glass look with a floating navbar, online food ordering, cart and Paystack checkout. Dark + light modes.", ordering: true },
  { key: "t8", name: "Vital", category: "Clinic & health", description: "Clinics, dentists, pharmacies and wellness practices." },
  { key: "t9", name: "Pulse", category: "Fitness", description: "Gyms, personal trainers, yoga and dance studios." },
  { key: "t10", name: "Campus", category: "Education", description: "Schools, tutors, academies and training centres." },
  { key: "t11", name: "Soirée", category: "Events", description: "Event planners, venues, caterers and celebrations." },
  { key: "t12", name: "Forge", category: "Trades & construction", description: "Builders, renovators, electricians, plumbers and home services." },
  { key: "t13", name: "Mode", category: "Fashion shop", description: "Fashion and clothing brands: a cinematic dark storefront with serif headlines, a lookbook feed, cart and Paystack checkout. Dark + light modes.", shop: true },
  { key: "t14", name: "Cartly", category: "General store", description: "Online stores and retailers: a quiet, product-first storefront with rounded cards, a product configurator, search, cart and Paystack checkout. Light + dark modes.", shop: true },
  { key: "t15", name: "Marque", category: "Automotive", description: "Car dealers, classic and luxury showrooms, restorers, detailers and car clubs: obsidian glass with a cinematic video or photo hero and a scrolling collection of cars. Dark + light modes." },
  { key: "t16", name: "Circle", category: "Community", description: "Churches, faith communities, membership clubs, masterminds and nonprofits: an airy off-white look with serif-italic headlines, deep-blue brand bands, community cards with fees and a join form. Light + dark modes." },
  { key: "t17", name: "Folio", category: "Blog & publication", description: "Writers, bloggers, newsletters, magazines and thought leaders: warm paper or ink-dark pages, serif headlines, a home page that leads with your latest posts, topics and a subscribe form. Light + dark modes.", blogFirst: true },
];

export function templateLabel(key: string) {
  const m = TEMPLATE_META.find((t) => t.key === key);
  return m ? `${m.name} — ${m.category}` : key.toUpperCase();
}

/** True for templates that can run the shop engine: e-commerce (`shop: true`) or online ordering (`ordering: true`). */
export function templateSupportsShop(key: string) {
  return TEMPLATE_META.some((t) => t.key === key && (t.shop === true || t.ordering === true));
}

/** True for templates whose home page shows the latest blog posts. */
export function templateIsBlogFirst(key: string) {
  return TEMPLATE_META.some((t) => t.key === key && t.blogFirst === true);
}
