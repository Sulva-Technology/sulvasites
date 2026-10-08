"use client";

import { useCallback, useEffect, useState } from "react";

import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { whatsAppNumber } from "@/lib/shop/whatsappOrder";
import {
  cardCheckoutOpen, parseCheckoutMode, parseOrdersNumber, whatsAppOrdersOpen, type CheckoutMode,
} from "@/lib/shop/checkoutMode";
import { btnCls, cardCls, errMsg, inputCls, Notice } from "./common";

const MODES: Array<{ id: CheckoutMode; label: string; hint: string }> = [
  {
    id: "card_and_whatsapp",
    label: "Card and WhatsApp",
    hint: "Customers pay on Paystack, or tap “Order on WhatsApp” to finish the order in a chat.",
  },
  { id: "card", label: "Card only", hint: "Customers pay on Paystack. No WhatsApp ordering buttons." },
  {
    id: "whatsapp",
    label: "WhatsApp only",
    hint: "Customers send their order on WhatsApp and you agree payment in the chat. No Paystack needed.",
  },
];

/** "How customers buy": Paystack, WhatsApp or both, and which number WhatsApp orders go to (migration 018). */
export default function CheckoutModeSettings({ siteId, paymentsReady }: { siteId: string; paymentsReady: boolean }) {
  const [mode, setMode] = useState<CheckoutMode>("card_and_whatsapp");
  const [number, setNumber] = useState("");
  const [profileWhatsApp, setProfileWhatsApp] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [missingColumns, setMissingColumns] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const [settings, profile] = await Promise.all([
        db.from("shop_settings").select("checkout_mode, whatsapp_orders_number").eq("site_id", siteId).maybeSingle(),
        db.from("business_profiles").select("whatsapp").eq("site_id", siteId).maybeSingle(),
      ]);
      if (settings.error?.code === "42703") setMissingColumns(true);
      else if (settings.error) throw settings.error;
      else if (settings.data) {
        setMode(parseCheckoutMode(settings.data.checkout_mode));
        setNumber(settings.data.whatsapp_orders_number ?? "");
      }
      if (!profile.error) setProfileWhatsApp(whatsAppNumber(profile.data?.whatsapp) ? String(profile.data?.whatsapp) : null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setErr(null);
    setOk(null);
    const parsed = parseOrdersNumber(number);
    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }
    if (whatsAppOrdersOpen(mode) && !parsed.value && !profileWhatsApp) {
      setErr("Add the WhatsApp number orders should go to.");
      return;
    }
    setBusy(true);
    try {
      const db = await getAuthenticatedClient();
      const { error } = await db
        .from("shop_settings")
        .upsert({ site_id: siteId, checkout_mode: mode, whatsapp_orders_number: parsed.value }, { onConflict: "site_id" });
      if (error) throw error;
      setNumber(parsed.value ?? "");
      setOk("Saved. The shop updates right away.");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-koi-ink">How customers buy</h2>
      <p className="mb-3 text-sm text-koi-ink/70">Choose card payments, WhatsApp orders, or both.</p>
      {!loaded ? (
        <div className="text-sm text-koi-ink/60">Loading…</div>
      ) : missingColumns ? (
        <Notice kind="warn">This setting needs a database update (migration 018). Contact Sulvatech to turn it on.</Notice>
      ) : (
        <>
          <div role="radiogroup" aria-label="How customers buy" className="grid gap-2 md:grid-cols-3">
            {MODES.map((m) => (
              <label
                key={m.id}
                className={`cursor-pointer rounded-2xl p-3 text-sm ring-1 transition ${
                  mode === m.id ? "bg-koi-deep/5 ring-koi-deep" : "ring-koi-ink/10 hover:ring-koi-ink/25"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-koi-ink">
                  <input type="radio" name="checkout-mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
                  {m.label}
                </span>
                <span className="mt-1 block text-koi-ink/65">{m.hint}</span>
              </label>
            ))}
          </div>

          {whatsAppOrdersOpen(mode) ? (
            <label className="mt-4 block text-sm font-medium text-koi-ink/80">
              WhatsApp number for orders
              <input
                className={inputCls}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={24}
                placeholder={profileWhatsApp ?? "+234 803 000 0000"}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-koi-ink/55">
                {profileWhatsApp
                  ? `Leave empty to use the site's contact WhatsApp (${profileWhatsApp}).`
                  : "Include the country code. The site has no contact WhatsApp, so this is required."}
              </span>
            </label>
          ) : null}

          {cardCheckoutOpen(mode) && !paymentsReady ? (
            <div className="mt-3">
              <Notice kind="warn">Card payments are not set up yet, so customers cannot pay by card. Set them up below.</Notice>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <button type="button" className={btnCls} disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </button>
            {ok ? <span className="text-sm text-green-700">{ok}</span> : null}
          </div>
          {err ? (
            <div className="mt-3">
              <Notice kind="error">{err}</Notice>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
