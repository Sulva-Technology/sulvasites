"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveMode, type ColorMode } from "./colorModeCore";

export type { ColorMode } from "./colorModeCore";

const KEY = "sulva-color-mode";

function readStored(): ColorMode | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Light/dark mode for templates that ship both. Starts from the visitor's saved
 * choice, else their system preference, and follows system changes until they pick.
 * Templates apply it as `data-mode` on their root.
 */
export function useColorMode(fallback?: ColorMode): [ColorMode, () => void] {
  const [mode, setMode] = useState<ColorMode>(fallback ?? "light");

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const sync = () => setMode(resolveMode(readStored(), !!mq?.matches, fallback));
    sync();
    mq?.addEventListener?.("change", sync);
    return () => mq?.removeEventListener?.("change", sync);
  }, [fallback]);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next: ColorMode = m === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable — choice lasts for this page view */
      }
      return next;
    });
  }, []);

  return [mode, toggle];
}

/** Sun/moon switch button. Style it per template via `className`. */
export function ModeToggle({ mode, onToggle, className }: { mode: ColorMode; onToggle: () => void; className?: string }) {
  const dark = mode === "dark";
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      data-mode={mode}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </>
        ) : (
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        )}
      </svg>
    </button>
  );
}
