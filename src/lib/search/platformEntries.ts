import { TEMPLATE_META } from "@/templates/meta";

/** Public marketing pages of the platform domain. `base` is "https://<platform>". */
export function platformEntries(base: string): Array<{ url: string; priority: number }> {
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/pricing`, priority: 0.9 },
    { url: `${base}/templates`, priority: 0.9 },
    { url: `${base}/start`, priority: 0.6 },
    { url: `${base}/signup`, priority: 0.6 },
    ...TEMPLATE_META.map((t) => ({ url: `${base}/templates/${t.key}`, priority: 0.7 })),
  ];
}
