"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a drawer that is mounted only while open: moves focus inside, keeps Tab and
 * Shift+Tab in the drawer, closes on Escape, locks page scroll, and returns focus to whatever had it.
 * Attach `ref` to the dialog element.
 */
export function useFocusTrap<T extends HTMLElement>(onClose: () => void, initialFocusSelector?: string) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("inert") && !el.closest("[inert]"));
    const first = (initialFocusSelector ? node.querySelector<HTMLElement>(initialFocusSelector) : null) ?? focusables()[0];
    (first ?? node).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const a = items[0];
      const z = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === a || active === node)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && active === z) {
        e.preventDefault();
        a.focus();
      } else if (!node.contains(active)) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [initialFocusSelector]);

  return ref;
}
