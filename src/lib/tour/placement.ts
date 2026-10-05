export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Placement =
  | { mode: "center" }
  | { mode: "sheet" }
  | { mode: "float"; side: "bottom" | "top" | "right" | "left" | "inside"; top: number; left: number };

export const SHEET_BREAKPOINT = 640;
export const GAP = 12;
export const MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

export function placeTooltip(target: Rect | null, tip: Size, vp: Size): Placement {
  if (vp.width < SHEET_BREAKPOINT) return { mode: "sheet" };
  if (!target) return { mode: "center" };

  const bottom = target.top + target.height;
  const right = target.left + target.width;
  const centeredLeft = clamp(target.left + target.width / 2 - tip.width / 2, MARGIN, vp.width - tip.width - MARGIN);
  const centeredTop = clamp(target.top + target.height / 2 - tip.height / 2, MARGIN, vp.height - tip.height - MARGIN);

  if (bottom + GAP + tip.height <= vp.height - MARGIN) {
    return { mode: "float", side: "bottom", top: bottom + GAP, left: centeredLeft };
  }
  if (target.top - GAP - tip.height >= MARGIN) {
    return { mode: "float", side: "top", top: target.top - GAP - tip.height, left: centeredLeft };
  }
  if (right + GAP + tip.width <= vp.width - MARGIN) {
    return { mode: "float", side: "right", top: centeredTop, left: right + GAP };
  }
  if (target.left - GAP - tip.width >= MARGIN) {
    return { mode: "float", side: "left", top: centeredTop, left: target.left - GAP - tip.width };
  }
  return { mode: "float", side: "inside", top: vp.height - tip.height - MARGIN, left: centeredLeft };
}
