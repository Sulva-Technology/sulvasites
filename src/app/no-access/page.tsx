import Link from "next/link";

import LogoutButton from "@/components/LogoutButton";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-semibold">No site access</h1>
        <p className="text-sm text-gray-600">
          Your account is not linked to any site yet. Ask your Sulvatech contact or the site
          owner to add you, then sign in again.
        </p>
        <div className="flex items-center justify-between">
          <Link href="/login" className="text-sm text-gray-600 underline">
            Back to sign in
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
