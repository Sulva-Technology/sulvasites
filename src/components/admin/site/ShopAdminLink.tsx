import Link from "next/link";

import { templateSupportsShop } from "@/templates/meta";

/** "Shop" link for /admin/sites/[siteId]; renders nothing unless the template supports a shop. */
export default function ShopAdminLink({ siteId, templateKey }: { siteId: string; templateKey: string }) {
  if (!templateSupportsShop(templateKey)) return null;
  return (
    <Link
      href={`/admin/sites/${siteId}/shop`}
      className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
    >
      Shop
    </Link>
  );
}
