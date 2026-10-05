import LogoutButton from "@/components/LogoutButton";
import { AuthCard } from "@/components/ui/AuthCard";
import { PillButton } from "@/components/ui/Button";

export default function NoAccessPage() {
  return (
    <AuthCard
      title="No site access"
      accent="not just yet"
      subtitle="Your account is not linked to any site yet. Ask your Sulvatech contact or the site owner to add you, then sign in again."
    >
      <div className="flex items-center justify-between gap-3">
        <PillButton href="/login" variant="glass" arrow={false}>
          Back to sign in
        </PillButton>
        <LogoutButton variant="glass" />
      </div>
    </AuthCard>
  );
}
