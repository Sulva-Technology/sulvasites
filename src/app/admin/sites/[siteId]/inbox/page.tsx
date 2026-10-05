import RequireAdmin from "@/components/RequireAdmin";
import InboxView from "@/components/inbox/InboxView";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Inbox</h1>
      <InboxView siteId={siteId} />
    </RequireAdmin>
  );
}
