import type { CartLine } from "./cart.ts";

export type CheckoutPayload = {
  lines: CartLine[];
  customer: { name: string; email: string; phone: string };
  deliveryMethod: "delivery" | "pickup";
  address?: string | null;
  notes?: string | null;
};

export type CheckoutProblem = { lineIndex: number; reason: string; available?: number };

export type CheckoutResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string; problems?: CheckoutProblem[] };

export type CheckoutEnv = {
  fetch: typeof fetch;
  /** Current page URL; sent so the server can build the Paystack callback on the right host. */
  href: string;
  assign: (url: string) => void;
};

function browserEnv(): CheckoutEnv {
  return { fetch: (...a) => fetch(...a), href: location.href, assign: (u) => location.assign(u) };
}

/** POSTs the cart to the checkout API and, on success, redirects to Paystack's hosted page. */
export async function startCheckout(
  siteId: string,
  payload: CheckoutPayload,
  env: CheckoutEnv = browserEnv(),
): Promise<CheckoutResult> {
  let res: Response;
  try {
    res = await env.fetch(`/api/shop/${encodeURIComponent(siteId)}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, returnUrl: env.href }),
    });
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof o.error === "string" ? o.error : "Could not start checkout. Please try again.",
      problems: Array.isArray(o.problems) ? (o.problems as CheckoutProblem[]) : undefined,
    };
  }
  const url = typeof o.authorizationUrl === "string" ? o.authorizationUrl : "";
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    /* invalid */
  }
  if (!parsed || parsed.protocol !== "https:" || typeof o.reference !== "string") {
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
  env.assign(parsed.toString());
  return { ok: true, authorizationUrl: parsed.toString(), reference: o.reference };
}
