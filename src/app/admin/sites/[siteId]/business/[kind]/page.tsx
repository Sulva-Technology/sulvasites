import BusinessManager from "@/components/business/BusinessManager";
import RequireAdmin from "@/components/RequireAdmin";

export default async function Page({ params }: { params: Promise<{ siteId: string; kind: string }> }) {
  const { siteId, kind } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Business data</h1>
      <BusinessManager siteId={siteId} basePath={`/admin/sites/${siteId}/business`} kind={kind} />
    </RequireAdmin>
  );
}
