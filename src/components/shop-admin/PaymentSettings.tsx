"use client";

import { useCallback, useEffect, useState } from "react";

import {
  apiFetch, btnCls, btnDangerCls, btnGhostCls, cardCls, errMsg, inputCls, NoAccess, Notice, type ShopAdminProps,
} from "./common";
import CheckoutModeSettings from "./CheckoutModeSettings";
import ShopAdminTabs from "./ShopAdminTabs";

type Status = {
  mode: "platform" | "own_keys" | null;
  platformFeeBps: number;
  platformAvailable: boolean;
  platform: { subaccount: boolean; bank: string | null; accountLast4: string | null };
  ownKeys: { publicKey: string | null; secretLast4: string | null };
};
type Bank = { name: string; code: string };

export default function PaymentSettings(props: ShopAdminProps) {
  // Sulvatech admins and shop owners only; staff never.
  if (props.role !== "admin" && props.role !== "owner") return <NoAccess />;
  return <Inner {...props} />;
}

function Inner(props: ShopAdminProps) {
  const { siteId, role } = props;
  const api = `/api/admin/sites/${encodeURIComponent(siteId)}/shop/payment`;
  const [status, setStatus] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [tab, setTab] = useState<"platform" | "own_keys">("platform");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksErr, setBanksErr] = useState<string | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [feePct, setFeePct] = useState("0");
  const [password, setPassword] = useState("");
  const needsPassword = role === "owner";

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Status>(api);
      if (!res.ok) throw new Error(res.data.error ?? "Could not load payment settings.");
      setStatus(res.data);
      setFeePct(String(res.data.platformFeeBps / 100));
      setTab(res.data.mode ?? "platform");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "platform" || banks.length || !status?.platformAvailable) return;
    let cancelled = false;
    apiFetch<{ banks?: Bank[] }>("/api/shop/banks").then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data.banks)) setBanks(res.data.banks);
      else setBanksErr(res.data.error ?? "Could not load banks.");
    });
    return () => {
      cancelled = true;
    };
  }, [tab, banks.length, status?.platformAvailable]);

  async function submit(body: Record<string, unknown>, success: string, method: "POST" | "DELETE" = "POST") {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      // Owners re-confirm their password for bank/key changes (the server enforces this too).
      const payload = needsPassword && (body.mode || method === "DELETE") ? { ...body, password } : body;
      const res = await apiFetch<Status>(api, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.data.error ?? "Request failed.");
      setStatus(res.data);
      setFeePct(String(res.data.platformFeeBps / 100));
      setOk(success);
      setPassword("");
      return true;
    } catch (e) {
      setErr(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function savePlatform() {
    if (needsPassword && !password) {
      setErr("Enter your password to confirm this change.");
      return;
    }
    const done = await submit({ mode: "platform", bankCode, accountNumber, businessName }, "Payout account saved. Payments will settle to this account.");
    if (done) setAccountNumber("");
  }

  async function saveOwnKeys() {
    if (needsPassword && !password) {
      setErr("Enter your password to confirm this change.");
      return;
    }
    const done = await submit({ mode: "own_keys", publicKey, secretKey }, "Paystack keys saved.");
    if (done) {
      setSecretKey("");
      setPublicKey("");
    }
  }

  async function removeKeys() {
    if (needsPassword && !password) {
      setErr("Enter your password to confirm this change.");
      return;
    }
    if (!window.confirm("Remove the saved Paystack keys? Customers will not be able to pay with them, and unpaid orders placed with them can no longer be verified.")) return;
    await submit({}, "Keys removed.", "DELETE");
  }

  async function saveFee() {
    const pct = Number(feePct);
    const bps = Math.round(pct * 100);
    if (!Number.isFinite(pct) || bps < 0 || bps > 10000) {
      setErr("Platform fee must be between 0 and 100 percent.");
      return;
    }
    await submit({ platformFeeBps: bps }, "Platform fee saved. Re-save the payout account to apply it to Paystack.");
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-koi-ink">Shop</h1>
      <ShopAdminTabs {...props} active="payments" />
      {err ? (
        <div className="mb-3">
          <Notice kind="error">{err}</Notice>
        </div>
      ) : null}
      {ok ? (
        <div className="mb-3">
          <Notice kind="ok">{ok}</Notice>
        </div>
      ) : null}
      {!loaded ? (
        <div className="text-sm text-koi-ink/60">Loading…</div>
      ) : !status ? null : (
        <div className="space-y-4">
          <CheckoutModeSettings
            siteId={siteId}
            paymentsReady={
              status.mode === "platform"
                ? status.platform.subaccount
                : status.mode === "own_keys" && Boolean(status.ownKeys.secretLast4 && status.ownKeys.publicKey)
            }
          />

          <section className={cardCls}>
            <h2 className="mb-2 text-sm font-semibold text-koi-ink">Current setup</h2>
            <p className="text-sm text-koi-ink/80">
              {status.mode === "platform"
                ? "Customers pay through Sulvatech's Paystack account; the money settles to the shop's bank account."
                : status.mode === "own_keys"
                  ? "Customers pay through the shop's own Paystack account."
                  : "Payments are not set up yet. Choose an option below."}
            </p>
          </section>

          {needsPassword ? (
            <section className={cardCls}>
              <Notice kind="warn">
                Changing the payout bank account or Paystack keys redirects where your customers&apos; money goes. Only change
                these if you are sure. You must enter your account password to confirm, and we email you and the shop&apos;s
                contact address every time they change.
              </Notice>
              <label className="mt-3 block text-sm font-medium text-koi-ink/80">
                Your account password
                <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </section>
          ) : null}

          <div role="tablist" aria-label="Payment mode" className="flex gap-2">
            <button type="button" role="tab" aria-selected={tab === "platform"} className={tab === "platform" ? btnCls : btnGhostCls} onClick={() => setTab("platform")}>
              Sulvatech Paystack
            </button>
            <button type="button" role="tab" aria-selected={tab === "own_keys"} className={tab === "own_keys" ? btnCls : btnGhostCls} onClick={() => setTab("own_keys")}>
              Own Paystack keys
            </button>
          </div>

          {tab === "platform" ? (
            <section className={cardCls}>
              <h2 className="mb-2 text-sm font-semibold text-koi-ink">Payout bank account</h2>
              {!status.platformAvailable ? (
                <Notice kind="warn">The platform Paystack account is not configured on this server.</Notice>
              ) : (
                <>
                  {status.platform.subaccount ? (
                    <p className="mb-3 text-sm text-koi-ink/80">
                      Saved account ending <b>{status.platform.accountLast4 ?? "••••"}</b>
                      {status.platform.bank ? ` at ${status.platform.bank}` : ""}. Fill the form to replace it.
                    </p>
                  ) : null}
                  {banksErr ? <Notice kind="error">{banksErr}</Notice> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-koi-ink/80">
                      Bank
                      <select className={inputCls} value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                        <option value="">Select a bank</option>
                        {banks.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-koi-ink/80">
                      Account number
                      <input className={inputCls} inputMode="numeric" maxLength={10} autoComplete="off" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} />
                    </label>
                    <label className="text-sm font-medium text-koi-ink/80 md:col-span-2">
                      Business name
                      <input className={inputCls} maxLength={100} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </label>
                  </div>
                  <button type="button" className={`${btnCls} mt-3`} disabled={busy || !bankCode || accountNumber.length !== 10 || businessName.trim().length < 2} onClick={savePlatform}>
                    {busy ? "Saving…" : status.platform.subaccount ? "Update payout account" : "Create payout account"}
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className={cardCls}>
              <h2 className="mb-2 text-sm font-semibold text-koi-ink">Paystack keys</h2>
              {status.ownKeys.secretLast4 ? (
                <p className="mb-3 text-sm text-koi-ink/80">
                  Secret key saved (ending <b>{status.ownKeys.secretLast4}</b>
                  {status.ownKeys.publicKey ? `, public key ${status.ownKeys.publicKey.slice(0, 8)}…` : ""}). It is never shown again. Enter new keys to replace it.
                </p>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-koi-ink/80">
                  Public key
                  <input className={`${inputCls} font-mono`} autoComplete="off" placeholder="pk_live_…" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
                </label>
                <label className="text-sm font-medium text-koi-ink/80">
                  Secret key
                  <input className={`${inputCls} font-mono`} type="password" autoComplete="new-password" placeholder="sk_live_…" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
                </label>
              </div>
              <p className="mt-2 text-xs text-koi-ink/55">The secret key is encrypted on the server. Use matching test or live keys.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnCls} disabled={busy || !publicKey.trim() || !secretKey.trim()} onClick={saveOwnKeys}>
                  {busy ? "Saving…" : "Save keys"}
                </button>
                {status.ownKeys.secretLast4 ? (
                  <button type="button" className={btnDangerCls} disabled={busy} onClick={removeKeys}>
                    Remove my keys
                  </button>
                ) : null}
              </div>
            </section>
          )}

          {role !== "admin" ? (
            <section className={cardCls}>
              <h2 className="mb-2 text-sm font-semibold text-koi-ink">Platform fee</h2>
              <p className="text-sm text-koi-ink/80">
                Fee: <b>{status.platformFeeBps / 100}%</b> of each sale. Set by Sulvatech; contact us to change it.
              </p>
            </section>
          ) : (
            <section className={cardCls}>
              <h2 className="mb-2 text-sm font-semibold text-koi-ink">Platform fee (Sulvatech only)</h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-medium text-koi-ink/80">
                  Fee (% of each sale)
                  <input className={`${inputCls} w-32`} inputMode="decimal" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
                </label>
                <button type="button" className={btnGhostCls} disabled={busy} onClick={saveFee}>
                  Save fee
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
