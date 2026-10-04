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

export async function paystackRequest<T>(
  path: string,
  { method = "GET", secret, body }: { method?: "GET" | "POST" | "PUT"; secret: string; body?: unknown },
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
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
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new PaystackError(timedOut ? 504 : 502, timedOut ? "Paystack timed out" : "Could not reach Paystack");
  }

  let json: PaystackEnvelope<T> | null = null;
  try {
    json = (await res.json()) as PaystackEnvelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new PaystackError(res.status, safeMessage(json?.message, `Paystack request failed (${res.status})`));
  }
  if (!json || json.status !== true) {
    throw new PaystackError(502, safeMessage(json?.message, "Paystack request failed"));
  }
  return json.data as T;
}
