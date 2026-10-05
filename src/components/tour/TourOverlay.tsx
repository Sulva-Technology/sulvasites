"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";

import { placeTooltip, type Placement, type Rect } from "@/lib/tour/placement";
import { nextVisibleIndex, stepPosition } from "@/lib/tour/steps";
import type { TourContext, TourStep } from "@/lib/tour/types";

const MISSING_TIMEOUT_MS = 2000;
const PAD = 8;

function sameRect(a: Rect | null, b: Rect): boolean {
  return !!a && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function TourOverlay({
  steps,
  index,
  ctx,
  onNext,
  onBack,
  onSkip,
  onMissing,
}: {
  steps: TourStep[];
  index: number;
  ctx: TourContext;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onMissing: () => void;
}) {
  const step = steps[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(!step.target);
  const [tipSize, setTipSize] = useState({ width: 340, height: 200 });
  // Overlay only mounts after client interaction/effects, never during SSR.
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const dialogRef = useRef<HTMLDivElement>(null);
  const missingRef = useRef(onMissing);
  useEffect(() => {
    missingRef.current = onMissing;
  }, [onMissing]);

  // Track the target every frame: survives route changes, scrolling, resizing and late renders.
  useEffect(() => {
    if (!step.target) return;
    const selector = `[data-tour="${step.target}"]`;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let seen = false;
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el && !seen && el.getClientRects().length === 0) {
        // Present but not rendered (display:none, e.g. desktop-only nav on mobile): skip now.
        missingRef.current();
        return;
      }
      const r = el?.getBoundingClientRect();
      if (el && r && r.width > 0 && r.height > 0) {
        if (!seen) {
          seen = true;
          el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          setReady(true);
        }
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
      } else if (!seen && performance.now() - t0 > MISSING_TIMEOUT_MS) {
        missingRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setTipSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (ready) dialogRef.current?.focus();
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onBack, onSkip]);

  // Keep focus inside the dialog while the overlay is mounted.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = dialogRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) el.focus();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  function trapFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>("button");
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const onContainer = active === dialogRef.current;
    if (e.shiftKey && (active === first || onContainer)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || onContainer)) {
      e.preventDefault();
      first.focus();
    }
  }

  const padded = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const placement: Placement = placeTooltip(step.target ? padded : null, tipSize, viewport);
  const { n, total } = stepPosition(steps, index, ctx);
  const isFirst = nextVisibleIndex(steps, index, -1, ctx) < 0;
  const isLast = nextVisibleIndex(steps, index, 1, ctx) < 0;
  const isWelcome = step.id === "welcome";

  let tipStyle: CSSProperties;
  const tipBase = "fixed z-[102] rounded-3xl bg-white p-5 text-koi-ink shadow-2xl ring-1 ring-koi-ink/10 outline-none";
  const tipClass =
    placement.mode === "sheet"
      ? `${tipBase} inset-x-4 bottom-4`
      : `${tipBase} w-[22rem] motion-safe:transition-[top,left] motion-safe:duration-200`;
  if (placement.mode === "sheet") {
    tipStyle = {};
  } else if (placement.mode === "center") {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    tipStyle = { top: placement.top, left: placement.left };
  }

  return (
    <>
      {/* Click shield: the page stays visible but inert while touring. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[100] ${padded ? "" : "bg-koi-ink/60"}`}
      />
      {padded ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[101] rounded-2xl ring-2 ring-koi-orange motion-safe:transition-all motion-safe:duration-200"
          style={{ ...padded, boxShadow: "0 0 0 9999px rgba(10,15,31,.6)" }}
        />
      ) : null}
      {ready ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          onKeyDown={trapFocus}
          className={tipClass}
          style={tipStyle}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-koi-ink/50">
            {isWelcome ? "Quick tour" : `${n} of ${total}`}
          </p>
          <h2 id="tour-title" className="mt-1 text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-koi-ink/75">
            {step.body}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-koi-ink/60 underline-offset-2 hover:text-koi-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
            >
              {isWelcome ? "Skip" : "Skip tour"}
            </button>
            <div className="flex items-center gap-2">
              {!isFirst ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full px-4 py-1.5 text-sm ring-1 ring-koi-ink/15 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-koi-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
              >
                {isWelcome ? "Show me around" : isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
