"use client";

import ShopFrame from "@/components/dashboard/ShopFrame";
import OrderInbox from "@/components/shop-admin/OrderInbox";

export default function Page() {
  return <ShopFrame render={(p) => <OrderInbox {...p} />} />;
}
