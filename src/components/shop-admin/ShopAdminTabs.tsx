"use client";

import Link from "next/link";

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
    <nav aria-label="Shop sections" className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
      {TABS.filter((t) => t.roles.includes(role)).map((t) => (
        <Link
          key={t.key}
          href={`${basePath}${t.path}`}
          aria-current={t.key === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            t.key === active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
