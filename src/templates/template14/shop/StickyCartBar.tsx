"use client";

import { formatNaira } from "@/lib/shop/money";
import { useT14 } from "../ctx";
import { IconBag } from "../icons";
import { useBag } from "./useBag";

/**
 * Phone-only floating pill pinned to the bottom while the bag has items: "View bag" with the item
 * count and the subtotal. Hidden on the bag, checkout and order pages, which carry those actions.
 */
export default function StickyCartBar() {
  const { openCart, shopViewKind } = useT14();
  const { subtotal, count, ready } = useBag();
  if (!ready || count === 0) return null;
  if (shopViewKind === "cart" || shopViewKind === "checkout" || shopViewKind === "order") return null;

  return (
    <button type="button" className="t14-cbar" onClick={openCart} aria-haspopup="dialog">
      <span className="t14-cbar-l">
        <IconBag size={20} /> View bag · {count}
      </span>
      <b>{formatNaira(subtotal)}</b>
    </button>
  );
}
