import RequireAdmin from "@/components/RequireAdmin";
import OrderDetail from "@/components/shop-admin/OrderDetail";

export default async function Page({ params }: { params: Promise<{ siteId: string; orderId: string }> }) {
  const { siteId, orderId } = await params;
  return (
    <RequireAdmin>
      <OrderDetail siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" orderId={orderId} />
    </RequireAdmin>
  );
}
