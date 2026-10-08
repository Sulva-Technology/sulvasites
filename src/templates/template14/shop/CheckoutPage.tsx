"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { startCheckout } from "@/lib/shop/checkoutClient";
import {
  parseCheckoutBody,
  parseCustomerEmail,
  parseCustomerName,
  parseCustomerPhone,
} from "@/lib/shop/checkoutInput";
import { formatNaira } from "@/lib/shop/money";
import { cardCheckoutOpen, orderWhatsApp } from "@/lib/shop/checkoutMode";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag, IconCheck, IconLock } from "../icons";
import CartLines, { type LineProblem } from "./CartLines";
import { useBag } from "./useBag";
import WhatsAppOrderButton from "./WhatsAppOrderButton";

type Field = "name" | "email" | "phone" | "address" | "notes";
type Errors = Partial<Record<Field, string>>;

const ADDRESS_MAX = 300;
const NOTES_MAX = 500;
// Free text may contain tabs/newlines but no other control characters (same rule as the server).
const TEXT_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} className="t14-co-err" role="alert">
      {message}
    </span>
  ) : null;
}

/** Guest checkout: contact, delivery or pickup, then Paystack. Validation mirrors the server's rules. */
export default function CheckoutPage() {
  const { baseUrl, shop, cart, profile } = useT14();
  const { rows, subtotal, blocked, ready } = useBag();
  const formRef = useRef<HTMLFormElement>(null);

  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<number, LineProblem>>({});
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  if (!shop) return null;
  // WhatsApp-only shops (checkout mode 'whatsapp') have no Paystack step: the form's details ride along in the chat.
  const card = cardCheckoutOpen(shop.settings.checkoutMode);
  const canWhatsApp = orderWhatsApp(shop.settings, profile.whatsapp) !== null;
  const pickup = shop.settings.pickupEnabled;
  const effective = pickup ? method : "delivery";
  const fee = effective === "delivery" ? shop.settings.deliveryFeeKobo : 0;
  const total = subtotal + fee;

  // Whatever the shopper has typed so far rides along in the WhatsApp message.
  const formDetails = () => {
    const data = formRef.current ? new FormData(formRef.current) : null;
    const get = (k: string) => String(data?.get(k) ?? "");
    return { name: get("name"), phone: get("phone"), email: get("email"), address: get("address"), notes: get("notes") };
  };

  const focusFirst = (errs: Errors) => {
    const order: Field[] = ["name", "email", "phone", "address", "notes"];
    const first = order.find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !card) return;
    setFormError(null);
    setProblems({});
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "");

    const errs: Errors = {};
    const name = parseCustomerName(get("name"));
    if (!name.ok) errs.name = name.error;
    const email = parseCustomerEmail(get("email"));
    if (!email.ok) errs.email = email.error;
    const phone = parseCustomerPhone(get("phone"));
    if (!phone.ok) errs.phone = phone.error;
    const address = get("address").trim();
    if (effective === "delivery") {
      if (!address) errs.address = "Enter your delivery address.";
      else if (address.length > ADDRESS_MAX || TEXT_CONTROL_RE.test(address)) {
        errs.address = `Delivery address must be at most ${ADDRESS_MAX} characters.`;
      }
    }
    const notes = get("notes").trim();
    if (notes.length > NOTES_MAX || TEXT_CONTROL_RE.test(notes)) errs.notes = `Notes must be at most ${NOTES_MAX} characters.`;
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    if (blocked) {
      setFormError("Some items in your cart are no longer available. Update your cart to continue.");
      return;
    }

    const payload = {
      lines: cart.lines,
      customer: { name: get("name"), email: get("email"), phone: get("phone") },
      deliveryMethod: effective,
      address: effective === "delivery" ? address : null,
      notes: notes || null,
    };
    const check = parseCheckoutBody(payload);
    if (!check.ok) {
      setFormError(check.error);
      return;
    }

    setBusy(true);
    const res = await startCheckout(shop.siteId, payload);
    if (res.ok) {
      setRedirecting(true); // the browser is being sent to Paystack
      return;
    }
    setBusy(false);
    setFormError(res.error);
    if (res.problems?.length) {
      const map: Record<number, LineProblem> = {};
      for (const p of res.problems) map[p.lineIndex] = { reason: p.reason, available: p.available };
      setProblems(map);
    }
  };

  if (!ready) {
    return (
      <section className="t14-co t14-shop-page">
        <div className="t14-container">
          <h1 className="t14-h1">Checkout.</h1>
          <p className="t14-cp-note" role="status">
            Loading your bag
          </p>
        </div>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="t14-co t14-shop-page">
        <div className="t14-container">
          <h1 className="t14-h1">Checkout.</h1>
          <div className="t14-cp-empty">
            <span className="t14-bag-empty-ico" aria-hidden="true">
              <IconBag size={30} />
            </span>
            <p className="t14-bag-empty-t">Your bag is empty</p>
            <Link className="t14-pill t14-pill-black t14-pill-lg" href={shopHref(baseUrl)}>
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const desc = (f: Field) => (errors[f] ? `t14-err-${f}` : undefined);

  // Radio cards: arrows move between delivery and pickup.
  const onMethodKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown";
    const prev = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!next && !prev) return;
    e.preventDefault();
    const to = effective === "delivery" ? "pickup" : "delivery";
    setMethod(to);
    e.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-method="${to}"]`)?.focus();
  };

  const methodCard = (m: "delivery" | "pickup", name: string, sub: string, price: string) => {
    const checked = effective === m;
    return (
      <button
        key={m}
        type="button"
        role="radio"
        className="t14-opt"
        aria-checked={checked}
        data-method={m}
        tabIndex={checked ? 0 : -1}
        onClick={() => setMethod(m)}
        onKeyDown={onMethodKey}
      >
        <span>
          <span className="t14-opt-name">{name}</span>
          <span className="t14-opt-sub">{sub}</span>
        </span>
        <span className="t14-opt-price">{price}</span>
        <span className="t14-opt-check" aria-hidden="true">
          {checked ? <IconCheck size={13} /> : null}
        </span>
      </button>
    );
  };

  return (
    <section className="t14-co t14-shop-page">
      <div className="t14-container">
        <header className="t14-cp-head">
          <nav className="t14-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            <span aria-hidden="true">/</span>
            <Link href={`${shopHref(baseUrl)}/cart`}>Bag</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Checkout</span>
          </nav>
          <h1 className="t14-h1">Checkout.</h1>
        </header>

        <div className="t14-co-layout">
          <form id="t14-checkout-form" ref={formRef} className="t14-co-form" onSubmit={onSubmit} noValidate aria-label="Checkout">
            <fieldset className="t14-co-card">
              <legend>
                <span className="t14-co-n" aria-hidden="true">
                  1
                </span>
                Contact
              </legend>
              <label className="t14-co-field">
                <span>Full name</span>
                <input
                  className="t14-co-input"
                  name="name"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={desc("name")}
                />
                <FieldError id="t14-err-name" message={errors.name} />
              </label>
              <div className="t14-co-row">
                <label className="t14-co-field">
                  <span>Email</span>
                  <input
                    className="t14-co-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={desc("email")}
                  />
                  <FieldError id="t14-err-email" message={errors.email} />
                </label>
                <label className="t14-co-field">
                  <span>Phone</span>
                  <input
                    className="t14-co-input"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                    aria-describedby={desc("phone")}
                  />
                  <FieldError id="t14-err-phone" message={errors.phone} />
                </label>
              </div>
            </fieldset>

            <fieldset className="t14-co-card">
              <legend>
                <span className="t14-co-n" aria-hidden="true">
                  2
                </span>
                {pickup ? "Delivery or pickup" : "Delivery"}
              </legend>
              {pickup ? (
                <div className="t14-co-opts" role="radiogroup" aria-label="Delivery method">
                  {methodCard("delivery", "Delivery", "To your address", shop.settings.deliveryFeeKobo > 0 ? formatNaira(shop.settings.deliveryFeeKobo) : "Free")}
                  {methodCard("pickup", "Pickup", "Collect your order", "Free")}
                </div>
              ) : null}
              {effective === "delivery" ? (
                <label className="t14-co-field">
                  <span>Delivery address</span>
                  <textarea
                    className="t14-co-input"
                    name="address"
                    rows={3}
                    maxLength={ADDRESS_MAX}
                    autoComplete="street-address"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.address}
                    aria-describedby={desc("address")}
                  />
                  <FieldError id="t14-err-address" message={errors.address} />
                </label>
              ) : shop.settings.pickupNote ? (
                <p className="t14-co-note">{shop.settings.pickupNote}</p>
              ) : null}
              <label className="t14-co-field">
                <span>Notes (optional)</span>
                <textarea
                  className="t14-co-input"
                  name="notes"
                  rows={2}
                  maxLength={NOTES_MAX}
                  aria-invalid={!!errors.notes}
                  aria-describedby={desc("notes")}
                />
                <FieldError id="t14-err-notes" message={errors.notes} />
              </label>
            </fieldset>

            <div className="t14-co-card" role="group" aria-labelledby="t14-co-pay-h">
              <p id="t14-co-pay-h" className="t14-co-legend">
                <span className="t14-co-n" aria-hidden="true">
                  3
                </span>
                Payment
              </p>
              <p className="t14-co-note" role="status">
                {!card
                  ? canWhatsApp
                    ? "Send your order on WhatsApp. The shop confirms it and how to pay in the chat."
                    : "Online ordering is paused right now. Please contact the shop to order."
                  : redirecting
                    ? "Redirecting to Paystack to complete your payment."
                    : "You will pay securely on Paystack's page."}
              </p>
            </div>
          </form>

          <aside className="t14-co-card t14-co-sum" aria-label="Order summary">
            <h2 className="t14-co-legend">Your order</h2>
            <CartLines rows={rows} serverProblems={problems} readOnly />
            <p className="t14-bsum-row">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </p>
            <p className="t14-bsum-row">
              <span>{effective === "pickup" ? "Pickup" : "Delivery"}</span>
              <span>{fee > 0 ? formatNaira(fee) : "Free"}</span>
            </p>
            <p className="t14-bsum-total t14-bsum-total-lg">
              <span>Total</span>
              <b>{formatNaira(total)}</b>
            </p>

            {formError ? (
              <div className="t14-co-formerr" role="alert">
                <p>{formError}</p>
                {Object.keys(problems).length ? (
                  <p>
                    <Link href={`${shopHref(baseUrl)}/cart`}>Review your bag</Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            {card ? (
              <>
                <button type="submit" form="t14-checkout-form" className="t14-pill t14-pill-black t14-pill-xl t14-pill-block" disabled={busy}>
                  {redirecting ? "Taking you to Paystack" : busy ? "Please wait" : "Pay with Paystack"}
                  {!busy ? <IconArrow size={18} /> : null}
                </button>
                <p className="t14-co-secure">
                  <IconLock size={13} /> Secured by Paystack
                </p>
              </>
            ) : null}
            <WhatsAppOrderButton
              rows={rows}
              label={card ? "Finish on WhatsApp instead" : "Send order on WhatsApp"}
              className={card ? undefined : "t14-pill t14-pill-black t14-pill-xl t14-pill-block t14-wa"}
              deliveryMethod={effective}
              deliveryKobo={fee}
              getDetails={formDetails}
            />
            <Link className="t14-co-edit" href={`${shopHref(baseUrl)}/cart`}>
              Edit bag
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
