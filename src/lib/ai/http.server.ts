import { NextResponse } from "next/server";

import { GroqError } from "./groq.server.ts";

const STATUS: Record<GroqError["code"], number> = {
  not_configured: 500,
  bad_key: 502,
  rate_limited: 429,
  upstream: 502,
  empty: 422,
};

export function aiErrorResponse(err: unknown) {
  if (err instanceof GroqError) {
    return NextResponse.json(
      { error: err.message, ...(err.detail ? { detail: err.detail } : {}) },
      { status: STATUS[err.code] },
    );
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    { status: 500 },
  );
}
