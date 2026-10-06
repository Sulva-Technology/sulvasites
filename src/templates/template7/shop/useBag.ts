"use client";

import { useMemo } from "react";

import { useT7 } from "../ctx";
import { cartSubtotal, resolveCart, type ResolvedLine } from "./helpers";

/** The cart priced against the loaded catalogue (display only; the server re-prices at checkout). */
export function useBag() {
  const { cart, shop } = useT7();
  const rows: ResolvedLine[] = useMemo(() => (shop ? resolveCart(cart.lines, shop) : []), [cart.lines, shop]);
  const subtotal = useMemo(() => cartSubtotal(rows), [rows]);
  const blocked = rows.some((r) => r.problem !== null);
  return { cart, shop, rows, subtotal, blocked, ready: cart.ready, count: cart.count };
}
