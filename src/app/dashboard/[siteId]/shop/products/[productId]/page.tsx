"use client";

import { useParams } from "next/navigation";

import ShopFrame from "@/components/dashboard/ShopFrame";
import ProductEditor from "@/components/shop-admin/ProductEditor";

export default function Page() {
  const params = useParams();
  const productId = typeof params?.productId === "string" ? params.productId : "";
  return <ShopFrame render={(p) => <ProductEditor {...p} productId={productId} />} />;
}
