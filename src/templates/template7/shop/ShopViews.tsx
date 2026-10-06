"use client";

import type { ShopView } from "@/lib/shop/types";
import { useT7 } from "../ctx";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import { findProductBySlug } from "./helpers";
import OrderMenu from "./OrderMenu";
import OrderPage from "./OrderPage";
import ProductPage from "./ProductPage";

/** Renders the ordering view the route asked for (menu, course, dish, cart, checkout, order status). */
export default function ShopViews({ view }: { view: ShopView }) {
  const { shop } = useT7();
  if (!shop) return null;
  switch (view.kind) {
    case "list":
      return <OrderMenu />;
    case "category":
      return <OrderMenu categorySlug={view.slug} />;
    case "product": {
      const product = findProductBySlug(shop, view.slug);
      return product ? <ProductPage key={product.id} product={product} /> : null;
    }
    case "cart":
      return <CartPage />;
    case "checkout":
      return <CheckoutPage />;
    case "order":
      return <OrderPage key={view.reference} reference={view.reference} />;
  }
}
