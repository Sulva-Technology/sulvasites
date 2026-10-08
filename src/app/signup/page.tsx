import type { Metadata } from "next";
import { Suspense } from "react";

import MarketingShell from "@/components/marketing/MarketingShell";
import SignupWizard from "@/components/marketing/SignupWizard";

export const metadata: Metadata = {
  title: "Start your free trial — Sulva Sites",
  description: "Build your business website in a few minutes. 7 days free, no card.",
};

export default function SignupPage() {
  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <SignupWizard />
      </Suspense>
    </MarketingShell>
  );
}
