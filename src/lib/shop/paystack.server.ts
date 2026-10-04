const PAYSTACK_BASE = "https://api.paystack.co";
const TIMEOUT_MS = 15_000;

/** Carries only an HTTP-ish status and Paystack's own message — never request data or secrets. */
export class PaystackError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PaystackError";
    this.status = status;
  }
}

type PaystackEnvelope<T> = { status?: unknown; message?: unknown; data?: T };

function safeMessage(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  // Defensive: never let anything that looks like a key leak through an error message.
  return raw.replace(/\b[sp]k_(test|live)_[A-Za-z0-9]+/g, "[redacted]").slice(0, 300);
}

type RequestOptions = { method?: "GET" | "POST" | "PUT"; secret: string; body?: unknown };

/** Paystack pagination/cursor info (e.g. `{ next: "cursor" | null }` with `use_cursor=true`). */
export type PaystackMeta = Record<string, unknown>;

/** Like `paystackRequest`, but also returns the envelope's `meta` (pagination). */
export async function paystackRequestWithMeta<T>(
  path: string,
  { method = "GET", secret, body }: RequestOptions,
): Promise<{ data: T; meta: PaystackMeta | null }> {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("://") ||
    /[\\\s]/.test(path)
  ) {
    throw new PaystackError(500, "Invalid Paystack path");
  }
  if (!secret) throw new PaystackError(500, "Paystack is not configured");

  let res: Response;
  try {
    res = await fetch(PAYSTACK_BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as { name?: unknown } | null)?.name;
    const timedOut = name === "TimeoutError" || name === "AbortError";
    throw new PaystackError(timedOut ? 504 : 502, timedOut ? "Paystack timed out" : "Could not reach Paystack");
  }

  let json: (PaystackEnvelope<T> & { meta?: unknown }) | null = null;
  try {
    json = (await res.json()) as PaystackEnvelope<T> & { meta?: unknown };
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new PaystackError(res.status, safeMessage(json?.message, `Paystack request failed (${res.status})`));
  }
  if (!json || json.status !== true) {
    throw new PaystackError(502, safeMessage(json?.message, "Paystack request failed"));
  }
  const meta = json.meta && typeof json.meta === "object" && !Array.isArray(json.meta) ? (json.meta as PaystackMeta) : null;
  return { data: json.data as T, meta };
}

export async function paystackRequest<T>(path: string, options: RequestOptions): Promise<T> {
  return (await paystackRequestWithMeta<T>(path, options)).data;
}
