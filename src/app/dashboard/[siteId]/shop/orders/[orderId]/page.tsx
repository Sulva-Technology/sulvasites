"use client";

import { useParams } from "next/navigation";

import ShopFrame from "@/components/dashboard/ShopFrame";
import OrderDetail from "@/components/shop-admin/OrderDetail";

export default function Page() {
  const params = useParams();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  return <ShopFrame render={(p) => <OrderDetail {...p} orderId={orderId} />} />;
}
