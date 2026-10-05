export type ColorMode = "light" | "dark";

/** Saved visitor choice, else the template's own default, else the system preference. */
export function resolveMode(stored: ColorMode | null, prefersDark: boolean, fallback?: ColorMode): ColorMode {
  if (stored) return stored;
  if (fallback) return fallback;
  return prefersDark ? "dark" : "light";
}
