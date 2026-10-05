/** Lightweight template descriptions for admin UI (no component imports). */
export type TemplateMeta = { key: string; name: string; category: string; description: string; shop?: boolean };

export const TEMPLATE_META: TemplateMeta[] = [
  { key: "t1", name: "Meridian", category: "Corporate", description: "Consultancies, agencies, clinics and professional services. Crisp fintech look." },
  { key: "t2", name: "Journal", category: "Editorial", description: "Creatives, media, fashion and studios — glossy magazine style." },
  { key: "t3", name: "Atelier", category: "Portfolio", description: "Personal brands, founders, designers and freelancers. Light glass look." },
  { key: "t4", name: "Launch", category: "Product / app", description: "Startups, apps and product launches. Light + dark modes." },
  { key: "t5", name: "Maison", category: "Beauty & booking", description: "Makeup artists, salons, spas and appointment businesses. Light + dark modes." },
  { key: "t6", name: "Estate", category: "Real estate", description: "Agencies, developers and property managers. Catalogue style, light + dark modes." },
  { key: "t7", name: "Tavola", category: "Restaurant", description: "Restaurants, cafés, caterers and bakeries." },
  { key: "t8", name: "Vital", category: "Clinic & health", description: "Clinics, dentists, pharmacies and wellness practices." },
  { key: "t9", name: "Pulse", category: "Fitness", description: "Gyms, personal trainers, yoga and dance studios." },
  { key: "t10", name: "Campus", category: "Education", description: "Schools, tutors, academies and training centres." },
  { key: "t11", name: "Soirée", category: "Events", description: "Event planners, venues, caterers and celebrations." },
  { key: "t12", name: "Forge", category: "Trades & construction", description: "Builders, renovators, electricians, plumbers and home services." },
  { key: "t13", name: "Mode", category: "Fashion shop", description: "Fashion boutiques and clothing brands with an online shop, cart and Paystack checkout. Light + dark modes.", shop: true },
  { key: "t14", name: "Cartly", category: "General store", description: "Online stores and retailers with search, deals, filters, cart and Paystack checkout. Light + dark modes.", shop: true },
];

export function templateLabel(key: string) {
  const m = TEMPLATE_META.find((t) => t.key === key);
  return m ? `${m.name} — ${m.category}` : key.toUpperCase();
}

/** True for e-commerce templates (set `shop: true` on their TEMPLATE_META entry). */
export function templateSupportsShop(key: string) {
  return TEMPLATE_META.some((t) => t.key === key && t.shop === true);
}
