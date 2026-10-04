import RequireAdmin from "@/components/RequireAdmin";
import PaymentSettings from "@/components/shop-admin/PaymentSettings";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <PaymentSettings siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" />
    </RequireAdmin>
  );
}
