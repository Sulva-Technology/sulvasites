import RequireAdmin from "@/components/RequireAdmin";
import OrderInbox from "@/components/shop-admin/OrderInbox";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <OrderInbox siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" />
    </RequireAdmin>
  );
}
