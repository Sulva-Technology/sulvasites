"use client";

import { useParams } from "next/navigation";

import RoleGate from "@/components/dashboard/RoleGate";
import { useSite } from "@/components/dashboard/SiteShell";
import ExtraPageEditor from "@/components/site-editor/ExtraPageEditor";

export default function DashboardExtraPageEditorPage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Editor />
    </RoleGate>
  );
}

function Editor() {
  const params = useParams();
  const { siteId } = useSite();
  const key = typeof params?.key === "string" ? params.key : "";
  return <ExtraPageEditor siteId={siteId} pageKey={key} mode="owner" basePath={`/dashboard/${siteId}/content`} />;
}
