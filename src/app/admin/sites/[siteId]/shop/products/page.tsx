import RequireAdmin from "@/components/RequireAdmin";
import ProductList from "@/components/shop-admin/ProductList";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <ProductList siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" />
    </RequireAdmin>
  );
}
