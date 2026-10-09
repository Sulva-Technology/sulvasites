import { PaystackError, paystackRequest } from "@/lib/shop/paystack.server";
import { isBillingReference } from "@/lib/billing/reference";

function secret(): string {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new PaystackError(500, "Paystack is not configured");
  return s;
}

export async function initializeCheckout(i: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string }> {
  return paystackRequest<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    secret: secret(),
    body: {
      email: i.email,
      amount: i.amountKobo,
      reference: i.reference,
      currency: "NGN",
      channels: ["card"],
      callback_url: i.callbackUrl,
      metadata: i.metadata,
    },
  });
}

export async function verifyTransaction(reference: string): Promise<Record<string, unknown>> {
  if (!isBillingReference(reference)) throw new PaystackError(400, "Invalid reference");
  return paystackRequest<Record<string, unknown>>(`/transaction/verify/${reference}`, { secret: secret() });
}

export async function createSubscription(i: { customer: string; plan: string; authorization: string; startDate: Date }) {
  return paystackRequest<{ subscription_code: string; email_token: string }>("/subscription", {
    method: "POST",
    secret: secret(),
    body: { customer: i.customer, plan: i.plan, authorization: i.authorization, start_date: i.startDate.toISOString() },
  });
}

export async function disableSubscription(code: string, token: string): Promise<void> {
  await paystackRequest<unknown>("/subscription/disable", { method: "POST", secret: secret(), body: { code, token } });
}

/** Paystack-hosted page where the owner updates their card. */
export async function manageLink(code: string): Promise<string> {
  if (!/^SUB_[A-Za-z0-9]+$/.test(code)) throw new PaystackError(400, "Invalid subscription");
  const data = await paystackRequest<{ link: string }>(`/subscription/${code}/manage/link`, { secret: secret() });
  return data.link;
}
