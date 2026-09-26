import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { rewritePathForHost } from "./src/lib/hostRouting";

export function middleware(req: NextRequest) {
  const target = rewritePathForHost(
    req.headers.get("host") || "",
    req.nextUrl.pathname,
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site",
  );
  if (!target) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
