"use client";

import type { ShopView } from "@/lib/shop/types";
import { useT13 } from "../ctx";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import { findProductBySlug } from "./helpers";
import OrderPage from "./OrderPage";
import ProductPage from "./ProductPage";
import ShopList from "./ShopList";

/** Renders the storefront view the route asked for (list, category, product, bag, checkout, order). */
export default function ShopViews({ view }: { view: ShopView }) {
  const { shop } = useT13();
  if (!shop) return null;
  switch (view.kind) {
    case "list":
      return <ShopList />;
    case "category":
      return <ShopList categorySlug={view.slug} />;
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
