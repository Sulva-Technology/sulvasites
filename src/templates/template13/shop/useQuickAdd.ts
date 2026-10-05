"use client";

import type { ShopProduct } from "@/lib/shop/types";
import { useT13 } from "../ctx";
import { productHref, productSoldOut, quickAddTarget, stockOf, variantInStock } from "./helpers";

/** Stock line for a product: sold out, "Only n left" when every buyable variant is low, else in stock. */
export function stockLine(product: ShopProduct): { state: "in" | "low" | "out"; label: string } {
  if (productSoldOut(product)) return { state: "out", label: "Sold out" };
  const live = product.variants.filter(variantInStock);
  if (live.length > 0 && live.every((v) => stockOf(v).kind === "low")) {
    const left = Math.max(...live.map((v) => v.stock ?? 0));
    return { state: "low", label: `Only ${left} left` };
  }
  return { state: "in", label: "In stock" };
}

/** Same cart call and stock guard as ProductPage; callers link to the product page when options need choosing. */
export function useQuickAdd() {
  const { cart, announce, baseUrl } = useT13();
  return (product: ShopProduct) => {
    const target = quickAddTarget(product);
    return {
      target,
      href: productHref(baseUrl, product),
      add: () => {
        if (target === "choose" || target === "out") return;
        const variant = target.variantId ? product.variants.find((v) => v.id === target.variantId) ?? null : null;
        const inBag = cart.lines
          .filter((l) => l.productId === product.id && l.variantId === target.variantId)
          .reduce((n, l) => n + l.quantity, 0);
        if (variant && variant.stock !== null && inBag >= variant.stock) {
          announce("You already have all available stock in your bag.");
          return;
        }
        cart.add({ productId: product.id, variantId: target.variantId, quantity: 1 });
        announce("Added to your bag");
      },
    };
  };
}
