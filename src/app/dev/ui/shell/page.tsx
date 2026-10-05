import { notFound } from "next/navigation";

import ShellDemo from "./ShellDemo";

/** Dev-only preview of the koi AppShell with sample content (no login). Disabled in production. */
export default function DevShellPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ShellDemo />;
}
