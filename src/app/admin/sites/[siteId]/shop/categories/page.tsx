import RequireAdmin from "@/components/RequireAdmin";
import CategoryManager from "@/components/shop-admin/CategoryManager";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <CategoryManager siteId={siteId} basePath={`/admin/sites/${siteId}/shop`} role="admin" />
    </RequireAdmin>
  );
}
