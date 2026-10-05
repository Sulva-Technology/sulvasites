"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { mergeTourContext } from "@/lib/tour/context";
import { hasUnsavedWorkRisk, needsNavigation, nextVisibleIndex, stepPosition } from "@/lib/tour/steps";
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
  const ctx = useMemo<TourContext>(() => mergeTourContext(baseContext, extra), [baseContext, extra]);
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const [index, setIndex] = useState(-1);
  const dirRef = useRef<1 | -1>(1);
  const expectedPathRef = useRef<string | null>(null);
  const lastPathRef = useRef(pathname);
  const autoStartedRef = useRef(false);
  const autoRunRef = useRef(false);
  const confirmedRef = useRef(false);
  const indexRef = useRef(-1);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const setContext = useCallback((patch: Partial<TourContext>) => {
    setExtra((prev) => ({ ...prev, ...patch }));
  }, []);

  const end = useCallback(() => {
    setIndex(-1);
    markTourDone(tour.id);
  }, [tour.id]);

  // Return focus to the tour button only after the overlay (and its focus trap) has unmounted.
  const prevIndexRef = useRef(-1);
  useEffect(() => {
    if (prevIndexRef.current >= 0 && index < 0) {
      document.querySelector<HTMLElement>('[data-tour="tour-button"]')?.focus();
    }
    prevIndexRef.current = index;
  }, [index]);
  const endRef = useRef(end);
  useEffect(() => {
    endRef.current = end;
  }, [end]);

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
        const targetPath = route.split("?")[0];
        const pathChanges = targetPath !== window.location.pathname;
        if (!confirmedRef.current) {
          confirmedRef.current = true;
          if (
            pathChanges &&
            hasUnsavedWorkRisk(window.location.pathname) &&
            !window.confirm("The tour will open other pages. Unsaved changes here will be lost. Continue?")
          ) {
            // Closed without marking done so the user can retry later.
            setIndex(-1);
            return;
          }
        }
        if (pathChanges) expectedPathRef.current = targetPath;
        router.push(route);
      }
      setIndex(i);
    },
    [end, router, tour.steps],
  );

  const startRun = useCallback(
    (auto: boolean) => {
      dirRef.current = 1;
      autoRunRef.current = auto;
      confirmedRef.current = false;
      goTo(nextVisibleIndex(tour.steps, -1, 1, ctxRef.current));
    },
    [goTo, tour.steps],
  );

  const start = useCallback(() => startRun(false), [startRun]);

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
      // Only centered steps would show (e.g. admin with no memberships): not worth auto-starting.
      if (stepPosition(tour.steps, tour.steps.length - 1, ctxRef.current).total <= 2) return;
      autoStartedRef.current = true;
      startRun(true);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, index, startRun, tour, ctx]);

  // Leaving the page yourself mid-tour ends it.
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    if (expectedPathRef.current === pathname) {
      expectedPathRef.current = null;
      return;
    }
    if (index < 0) return;
    // An auto-started run still on its first step was likely interrupted by a redirect (e.g. single-site owner
    // bounced to their site): close quietly and allow auto-start again on the new path.
    const interruptedAuto =
      autoRunRef.current && index === nextVisibleIndex(tour.steps, -1, 1, ctxRef.current);
    // Deferred so the state update does not happen synchronously in the effect body.
    // Not cleared on dep change: lastPathRef is already updated, so a cancelled timer would never re-fire.
    window.setTimeout(() => {
      if (interruptedAuto && indexRef.current === index) {
        autoRunRef.current = false;
        autoStartedRef.current = false;
        setIndex(-1);
      } else {
        endRef.current();
      }
    }, 0);
  }, [pathname, index, tour.steps]);

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
