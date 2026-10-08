import Link from "next/link";

export default function DemoBar({ templateKey, name }: { templateKey: string; name: string }) {
  return (
    <div className="fixed inset-x-0 bottom-3 z-[2147483000] flex justify-center px-3 font-sans">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-koi-ink/90 p-1.5 pl-4 text-sm text-white shadow-2xl" style={{ backdropFilter: "blur(10px)" }}>
        <Link href="/templates" className="whitespace-nowrap text-white/70 hover:text-white">← All</Link>
        <span className="whitespace-nowrap font-medium">{name}</span>
        <Link href={`/start?template=${templateKey}`} className="whitespace-nowrap rounded-full px-3 py-2 ring-1 ring-white/30 hover:bg-white/10">
          Have us build it
        </Link>
        <Link href={`/signup?template=${templateKey}`} className="whitespace-nowrap rounded-full bg-white px-4 py-2 font-medium text-koi-ink">
          Use this template
        </Link>
      </div>
    </div>
  );
}
