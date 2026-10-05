"use client";

import ShopFrame from "@/components/dashboard/ShopFrame";
import CategoryManager from "@/components/shop-admin/CategoryManager";

export default function Page() {
  return <ShopFrame render={(p) => <CategoryManager {...p} />} />;
}
