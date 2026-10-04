/**
 * Paystack test-mode transactions (`data.domain === "test"`) must never mark an order paid in production,
 * otherwise a shopper could pay with a test card against a live deployment.
 */
export function isBlockedTestPayment(domain: unknown, nodeEnv: string | undefined): boolean {
  return domain === "test" && nodeEnv === "production";
}
