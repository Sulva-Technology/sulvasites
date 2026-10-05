import BusinessIndex from "@/components/business/BusinessIndex";
import RequireAdmin from "@/components/RequireAdmin";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Business data</h1>
      <BusinessIndex siteId={siteId} basePath={`/admin/sites/${siteId}/business`} />
    </RequireAdmin>
  );
}
