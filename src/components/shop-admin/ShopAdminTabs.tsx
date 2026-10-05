"use client";

import { Tabs } from "@/components/ui/Tabs";

import type { ShopAdminProps } from "./common";

export type ShopTabKey = "overview" | "products" | "categories" | "orders" | "payments";

const TABS: Array<{ key: ShopTabKey; label: string; path: string; roles: string[] }> = [
  { key: "overview", label: "Overview", path: "", roles: ["admin", "owner"] },
  { key: "products", label: "Products", path: "/products", roles: ["admin", "owner"] },
  { key: "categories", label: "Categories", path: "/categories", roles: ["admin", "owner"] },
  { key: "orders", label: "Orders", path: "/orders", roles: ["admin", "owner", "staff"] },
  { key: "payments", label: "Payments", path: "/payments", roles: ["admin", "owner"] },
];

export default function ShopAdminTabs({ basePath, role, active }: ShopAdminProps & { active: ShopTabKey }) {
  return (
    <div className="mb-6">
      <Tabs
        label="Shop sections"
        active={active}
        items={TABS.filter((t) => t.roles.includes(role)).map((t) => ({
          id: t.key,
          label: t.label,
          href: `${basePath}${t.path}`,
        }))}
      />
    </div>
  );
}
