import RequireAdmin from "@/components/RequireAdmin";
import ProductEditor from "@/components/shop-admin/ProductEditor";

export default async function Page({ params }: { params: Promise<{ siteId: string; productId: string }> }) {
  const { siteId, productId } = await params;
  return (
    <RequireAdmin>
      <ProductEditor siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" productId={productId} />
    </RequireAdmin>
  );
}
