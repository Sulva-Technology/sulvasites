import type { TourContext } from "./types.ts";

/** Overlay `extra` onto `base`, ignoring keys whose value is undefined. */
export function mergeTourContext(base: TourContext | undefined, extra: TourContext): TourContext {
  const out: TourContext = { ...base };
  for (const key of Object.keys(extra) as Array<keyof TourContext>) {
    if (extra[key] !== undefined) (out as Record<string, unknown>)[key] = extra[key];
  }
  return out;
}
