"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { addLine, cartCount, cartStorageKey, parseCart, removeLine, setQty, type CartLine } from "./cart";

const LOCAL_EVENT = "sulva-cart-change";

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// If storage is unavailable (private mode / quota) the cart still works for this page view.
const memory = new Map<string, string | null>();
let storageWorks = true;

function snapshot(key: string): string | null {
  return storageWorks ? readRaw(key) : (memory.get(key) ?? null);
}

function writeRaw(key: string, value: string | null) {
  memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify); // other tabs
  window.addEventListener(LOCAL_EVENT, notify); // this tab
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(LOCAL_EVENT, notify);
  };
}

const subscribeNoop = () => () => {};

/**
 * Client cart persisted in localStorage per site. Renders empty on the server and during
 * hydration (`ready` is false), then reads storage; stays in sync across tabs via `storage`.
 */
export function useCart(siteId: string) {
  const key = cartStorageKey(siteId);
  const raw = useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    () => null,
  );
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const lines = useMemo(() => parseCart(raw), [raw]);

  // Always derive from the freshest stored value so two tabs don't clobber each other.
  const update = useCallback(
    (fn: (cur: CartLine[]) => CartLine[]) => {
      const next = fn(parseCart(snapshot(key)));
      writeRaw(key, next.length === 0 ? null : JSON.stringify(next));
    },
    [key],
  );

  const add = useCallback((line: CartLine) => update((cur) => addLine(cur, line)), [update]);
  const setQuantity = useCallback(
    (index: number, qty: number) => update((cur) => setQty(cur, index, qty)),
    [update],
  );
  const remove = useCallback((index: number) => update((cur) => removeLine(cur, index)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  return { lines, ready, count: cartCount(lines), add, setQty: setQuantity, remove, clear };
}
