import RequireAdmin from "@/components/RequireAdmin";
import ShopOverview from "@/components/shop-admin/ShopOverview";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <ShopOverview siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" />
    </RequireAdmin>
  );
}
