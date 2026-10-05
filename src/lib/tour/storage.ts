type KV = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function tourStorageKey(id: string): string {
  return `sulva.tour.${id}.done`;
}

function defaultStore(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isTourDone(id: string, store: KV | null = defaultStore()): boolean {
  try {
    return store?.getItem(tourStorageKey(id)) === "1";
  } catch {
    return false;
  }
}

export function markTourDone(id: string, store: KV | null = defaultStore()): void {
  try {
    store?.setItem(tourStorageKey(id), "1");
  } catch {
    // Private mode / blocked storage: tour may show again, still skippable.
  }
}
