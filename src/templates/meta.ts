/** Lightweight template descriptions for admin UI (no component imports). */
export type TemplateMeta = { key: string; name: string; category: string; description: string };

export const TEMPLATE_META: TemplateMeta[] = [
  { key: "t1", name: "Meridian", category: "Corporate", description: "Consultancies, agencies, clinics and professional services." },
  { key: "t2", name: "Journal", category: "Editorial", description: "Creatives, media, fashion and studios with stories to tell." },
  { key: "t3", name: "Atelier", category: "Portfolio", description: "Personal brands, founders, designers and freelancers." },
  { key: "t4", name: "Launch", category: "Product / app", description: "Startups, apps and product launches." },
  { key: "t5", name: "Maison", category: "Beauty & booking", description: "Makeup artists, salons, spas and appointment businesses." },
  { key: "t6", name: "Estate", category: "Real estate", description: "Agencies, developers and property managers." },
];

export function templateLabel(key: string) {
  const m = TEMPLATE_META.find((t) => t.key === key);
  return m ? `${m.name} — ${m.category}` : key.toUpperCase();
}
