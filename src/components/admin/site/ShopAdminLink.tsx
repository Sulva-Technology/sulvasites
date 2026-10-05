import Link from "next/link";

import { templateSupportsShop } from "@/templates/meta";

/** "Shop" link for /admin/sites/[siteId]; renders nothing unless the template supports a shop. */
export default function ShopAdminLink({ siteId, templateKey }: { siteId: string; templateKey: string }) {
  if (!templateSupportsShop(templateKey)) return null;
  return (
    <Link
      href={`/admin/sites/${siteId}/shop`}
      className="rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
    >
      Shop
    </Link>
  );
}
