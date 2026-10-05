"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { needsNavigation, nextVisibleIndex } from "@/lib/tour/steps";
import { isTourDone, markTourDone } from "@/lib/tour/storage";
import type { TourContext, TourDef } from "@/lib/tour/types";

import { TourOverlay } from "./TourOverlay";

type TourApi = {
  start: () => void;
  active: boolean;
  setContext: (patch: Partial<TourContext>) => void;
};

const TourCtx = createContext<TourApi | null>(null);
// Separate, stable context so syncing components don't re-run on every step change.
const TourSetterCtx = createContext<TourApi["setContext"] | null>(null);

export function useTour(): Pick<TourApi, "start" | "active"> | null {
  return useContext(TourCtx);
}

/** Pushes page-level facts (current site, visible tabs, first site) into the tour while mounted. */
export function TourContextSync(props: Partial<TourContext>) {
  const setContext = useContext(TourSetterCtx);
  const key = JSON.stringify(props);
  useEffect(() => {
    if (!setContext) return;
    const patch = JSON.parse(key) as Partial<TourContext>;
    setContext(patch);
    return () => {
      const cleared: Partial<TourContext> = {};
      for (const k of Object.keys(patch) as Array<keyof TourContext>) cleared[k] = undefined;
      setContext(cleared);
    };
  }, [setContext, key]);
  return null;
}

const AUTO_START_DELAY_MS = 700;

export function TourProvider({
  tour,
  baseContext,
  children,
}: {
  tour: TourDef;
  baseContext?: TourContext;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [extra, setExtra] = useState<TourContext>({});
  const ctx = useMemo<TourContext>(() => ({ ...baseContext, ...extra }), [baseContext, extra]);
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const [index, setIndex] = useState(-1);
  const dirRef = useRef<1 | -1>(1);
  const expectedPathRef = useRef<string | null>(null);
  const lastPathRef = useRef(pathname);
  const autoStartedRef = useRef(false);

  const setContext = useCallback((patch: Partial<TourContext>) => {
    setExtra((prev) => ({ ...prev, ...patch }));
  }, []);

  const end = useCallback(() => {
    setIndex(-1);
    markTourDone(tour.id);
    document.querySelector<HTMLElement>('[data-tour="tour-button"]')?.focus();
  }, [tour.id]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) {
        end();
        return;
      }
      const step = tour.steps[i];
      const route = step.route?.(ctxRef.current) ?? null;
      const current = window.location.pathname + window.location.search;
      if (route && needsNavigation(route, current, step.routePrefix)) {
        expectedPathRef.current = route.split("?")[0];
        router.push(route);
      }
      setIndex(i);
    },
    [end, router, tour.steps],
  );

  const start = useCallback(() => {
    dirRef.current = 1;
    goTo(nextVisibleIndex(tour.steps, -1, 1, ctxRef.current));
  }, [goTo, tour.steps]);

  const next = useCallback(() => {
    dirRef.current = 1;
    goTo(nextVisibleIndex(tour.steps, index, 1, ctxRef.current));
  }, [goTo, index, tour.steps]);

  const back = useCallback(() => {
    const i = nextVisibleIndex(tour.steps, index, -1, ctxRef.current);
    if (i < 0) return;
    dirRef.current = -1;
    goTo(i);
  }, [goTo, index, tour.steps]);

  const skipMissing = useCallback(() => {
    goTo(nextVisibleIndex(tour.steps, index, dirRef.current, ctxRef.current));
  }, [goTo, index, tour.steps]);

  // Auto-start once, after redirects (e.g. single-site owners bounced to their site) settle.
  useEffect(() => {
    if (autoStartedRef.current || index >= 0) return;
    if (!tour.autoStart(pathname) || isTourDone(tour.id)) return;
    const t = window.setTimeout(() => {
      autoStartedRef.current = true;
      start();
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, index, start, tour]);

  // Leaving the page yourself mid-tour ends it.
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    if (expectedPathRef.current === pathname) {
      expectedPathRef.current = null;
      return;
    }
    if (index < 0) return;
    // Deferred so the state update does not happen synchronously in the effect body.
    const t = window.setTimeout(end, 0);
    return () => window.clearTimeout(t);
  }, [pathname, index, end]);

  const api = useMemo<TourApi>(() => ({ start, active: index >= 0, setContext }), [start, index, setContext]);

  return (
    <TourSetterCtx.Provider value={setContext}>
      <TourCtx.Provider value={api}>
        {children}
        {index >= 0 ? (
          <TourOverlay
            key={index}
            steps={tour.steps}
            index={index}
            ctx={ctx}
            onNext={next}
            onBack={back}
            onSkip={end}
            onMissing={skipMissing}
          />
        ) : null}
      </TourCtx.Provider>
    </TourSetterCtx.Provider>
  );
}
