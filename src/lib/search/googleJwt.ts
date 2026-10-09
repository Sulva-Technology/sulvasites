/** Service-account JWT for Google's OAuth token endpoint. Relative imports only (unit-tested). */
import { createSign } from "node:crypto";

export type ServiceAccount = { client_email: string; private_key: string };

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** GOOGLE_SEARCH_SA_JSON is the key file base64-encoded (env vars mangle its newlines otherwise). */
export function parseServiceAccount(b64: string): ServiceAccount | null {
  try {
    const raw = JSON.parse(Buffer.from(b64.trim(), "base64").toString("utf8")) as Partial<ServiceAccount>;
    if (typeof raw.client_email !== "string" || typeof raw.private_key !== "string") return null;
    return { client_email: raw.client_email, private_key: raw.private_key };
  } catch {
    return null;
  }
}

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function buildJwt(sa: ServiceAccount, scopes: string[], nowSec: number): string {
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const claims = b64url({
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(sa.private_key).toString("base64url")}`;
}
