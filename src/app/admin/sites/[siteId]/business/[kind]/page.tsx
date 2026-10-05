import Link from "next/link";

import BusinessManager from "@/components/business/BusinessManager";
import RequireAdmin from "@/components/RequireAdmin";

export default async function Page({ params }: { params: Promise<{ siteId: string; kind: string }> }) {
  const { siteId, kind } = await params;
  return (
    <RequireAdmin>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Business data</h1>
        <Link href={`/admin/sites/${siteId}`} className="text-sm text-gray-600 underline">
          Back to site
        </Link>
      </div>
      <BusinessManager siteId={siteId} basePath={`/admin/sites/${siteId}/business`} kind={kind} />
    </RequireAdmin>
  );
}
