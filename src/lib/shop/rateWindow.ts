export type Bucket = number[];

export const MAX_KEYS = 5000;

/**
 * Pure sliding-window check against an explicit store. Returns seconds until retry when limited, else null.
 * Evicts stale keys (when over the key cap) so unauthenticated traffic can't grow the map forever.
 */
export function checkWindow(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
  maxKeys = MAX_KEYS,
): number | null {
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
  }
  recent.push(now);
  store.set(key, recent);

  if (store.size > maxKeys) {
    for (const [k, v] of store) {
      if (!v.some((t) => now - t < windowMs)) store.delete(k);
    }
    // Still over cap: drop oldest-inserted keys.
    while (store.size > maxKeys) {
      const first = store.keys().next().value;
      if (first === undefined) break;
      store.delete(first);
    }
  }
  return null;
}
