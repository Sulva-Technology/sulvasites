"use client";

import ShopFrame from "@/components/dashboard/ShopFrame";
import ProductList from "@/components/shop-admin/ProductList";

export default function Page() {
  return <ShopFrame render={(p) => <ProductList {...p} />} />;
}
