"use client";

import { createContext, useContext, type ReactNode } from "react";

const FitContext = createContext(true);

export function TemplateFitProvider({ fits, children }: { fits: boolean; children?: ReactNode }) {
  return <FitContext.Provider value={fits}>{children}</FitContext.Provider>;
}

/**
 * True when the business is in the industry this design was made for. When false, use neutral
 * wording instead of the design's industry lines (see src/lib/templateFit.ts).
 */
export function useFitsIndustry(): boolean {
  return useContext(FitContext);
}
