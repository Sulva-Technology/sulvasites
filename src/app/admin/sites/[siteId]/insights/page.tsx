import Link from "next/link";

import RequireAdmin from "@/components/RequireAdmin";
import InsightsView from "@/components/insights/InsightsView";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Insights</h1>
        <Link href={`/admin/sites/${siteId}`} className="text-sm text-gray-600 underline">
          Back to site
        </Link>
      </div>
      <InsightsView siteId={siteId} />
    </RequireAdmin>
  );
}
