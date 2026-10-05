"use client";

import ShopFrame from "@/components/dashboard/ShopFrame";
import PaymentSettings from "@/components/shop-admin/PaymentSettings";

export default function Page() {
  return <ShopFrame render={(p) => <PaymentSettings {...p} />} />;
}
