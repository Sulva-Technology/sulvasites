import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Sulva Sites</h1>
      <p className="mt-2 text-sm text-gray-700">
        Please sign in to access admin features.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Go to login
      </Link>
    </main>
  );
}

