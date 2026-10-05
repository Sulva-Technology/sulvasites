import { notFound } from "next/navigation";

import NewSiteDemo from "./NewSiteDemo";

/** Dev-only: the admin new-site page inside the koi shell, without the admin guard. Disabled in production. */
export default function DevNewSitePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <NewSiteDemo />;
}
