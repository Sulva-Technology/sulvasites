"use client";

import ShopFrame from "@/components/dashboard/ShopFrame";
import ShopOverview from "@/components/shop-admin/ShopOverview";

export default function Page() {
  return <ShopFrame staffTo="/orders" render={(p) => <ShopOverview {...p} />} />;
}
