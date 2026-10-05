import type { TourContext, TourStep } from "./types.ts";

export function isStepVisible(step: TourStep, ctx: TourContext): boolean {
  if (step.when && !step.when(ctx)) return false;
  if (step.route && step.route(ctx) === null) return false;
  return true;
}

export function nextVisibleIndex(steps: TourStep[], from: number, dir: 1 | -1, ctx: TourContext): number {
  for (let i = from + dir; i >= 0 && i < steps.length; i += dir) {
    if (isStepVisible(steps[i], ctx)) return i;
  }
  return -1;
}

export function stepPosition(steps: TourStep[], index: number, ctx: TourContext): { n: number; total: number } {
  let n = 0;
  let total = 0;
  steps.forEach((step, i) => {
    if (!isStepVisible(step, ctx)) return;
    total += 1;
    if (i <= index) n += 1;
  });
  return { n, total };
}

export function needsNavigation(route: string, current: string, prefix = false): boolean {
  if (current === route) return false;
  if (!prefix) return true;
  return !(current.startsWith(`${route}/`) || current.startsWith(`${route}?`));
}

/** Pages where soft-navigating away can lose in-progress work (assistant chat, uploads, page editors). */
export function hasUnsavedWorkRisk(pathname: string): boolean {
  const path = pathname.split("?")[0];
  if (path === "/admin/sites/new" || path.startsWith("/admin/sites/new/")) return true;
  const segs = path.split("/");
  return segs.includes("pages") || segs.includes("extra-pages");
}
