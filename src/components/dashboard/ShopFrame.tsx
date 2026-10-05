"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSite } from "@/components/dashboard/SiteShell";
import type { ShopAdminProps } from "@/components/shop-admin/common";
import { templateSupportsShop } from "@/templates/meta";

/**
 * Mounts a shop-admin component under /dashboard/[siteId]/shop. Renders nothing for templates without a shop.
 * `staffTo` redirects staff (who only see orders) to a section they may open.
 */
export default function ShopFrame({
  render,
  staffTo,
}: {
  render: (props: ShopAdminProps) => ReactNode;
  staffTo?: string;
}) {
  const { siteId, role, site } = useSite();
  const router = useRouter();
  const base = `/dashboard/${siteId}/shop`;
  const redirect = role === "staff" && staffTo ? staffTo : null;

  useEffect(() => {
    if (redirect) router.replace(`${base}${redirect}`);
  }, [redirect, router, base]);

  if (!templateSupportsShop(site.template_key)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This website does not have a shop.
      </div>
    );
  }
  if (redirect) return <div className="text-sm text-koi-ink/60">Loading…</div>;
  return <>{render({ siteId, basePath: base, role })}</>;
}
