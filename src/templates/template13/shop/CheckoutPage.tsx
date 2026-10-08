"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { startCheckout } from "@/lib/shop/checkoutClient";
import {
  parseCheckoutBody,
  parseCustomerEmail,
  parseCustomerName,
  parseCustomerPhone,
} from "@/lib/shop/checkoutInput";
import { formatNaira } from "@/lib/shop/money";
import { cardCheckoutOpen, orderWhatsApp } from "@/lib/shop/checkoutMode";
import { shopHref, useT13 } from "../ctx";
import { IconArrow, IconBag } from "../icons";
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
    <span id={id} className="t13-field-error" role="alert">
      {message}
    </span>
  ) : null;
}

/** Guest checkout: contact, delivery or pickup, then Paystack. Validation mirrors the server's rules. */
export default function CheckoutPage() {
  const { baseUrl, shop, cart, profile } = useT13();
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
      setFormError("Some items in your bag are no longer available. Update your bag to continue.");
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
      <section className="t13-section t13-sp">
        <div className="t13-container">
          <h1 className="t13-sp-title">Checkout</h1>
          <p className="t13-muted" role="status">
            Loading your bag
          </p>
        </div>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="t13-section t13-sp">
        <div className="t13-container">
          <h1 className="t13-sp-title">Checkout</h1>
          <div className="t13-empty">
            <span className="t13-empty-ico" aria-hidden="true">
              <IconBag size={38} />
            </span>
            <p className="t13-empty-title">Your bag is empty</p>
            <Link className="t13-pill t13-pill-solid t13-pill-lg" href={shopHref(baseUrl)}>
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const desc = (f: Field) => (errors[f] ? `t13-err-${f}` : undefined);

  return (
    <section className="t13-section t13-sp">
      <div className="t13-container">
        <header className="t13-sp-head">
          <nav className="t13-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            <span aria-hidden="true">/</span>
            <Link href={`${shopHref(baseUrl)}/cart`}>Bag</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Checkout</span>
          </nav>
          <h1 className="t13-sp-title">Checkout</h1>
        </header>

        <div className="t13-bag-layout t13-co-layout">
          <form id="t13-checkout-form" ref={formRef} className="t13-checkout" onSubmit={onSubmit} noValidate aria-label="Checkout">
            <fieldset className="t13-fieldset">
              <legend>
                <span className="t13-mono t13-fs-n">01</span> Contact
              </legend>
              <label className="t13-field">
                <span>Full name</span>
                <input
                  className="t13-input"
                  name="name"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={desc("name")}
                />
                <FieldError id="t13-err-name" message={errors.name} />
              </label>
              <div className="t13-form-row">
                <label className="t13-field">
                  <span>Email</span>
                  <input
                    className="t13-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={desc("email")}
                  />
                  <FieldError id="t13-err-email" message={errors.email} />
                </label>
                <label className="t13-field">
                  <span>Phone</span>
                  <input
                    className="t13-input"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                    aria-describedby={desc("phone")}
                  />
                  <FieldError id="t13-err-phone" message={errors.phone} />
                </label>
              </div>
            </fieldset>

            <fieldset className="t13-fieldset">
              <legend>
                <span className="t13-mono t13-fs-n">02</span> {pickup ? "Delivery or pickup" : "Delivery"}
              </legend>
              {pickup ? (
                <div className="t13-choice-row">
                  <label className="t13-choice" data-checked={effective === "delivery"}>
                    <input type="radio" name="method" value="delivery" checked={effective === "delivery"} onChange={() => setMethod("delivery")} />
                    <span>
                      <b>Delivery</b>
                      <small>{shop.settings.deliveryFeeKobo > 0 ? formatNaira(shop.settings.deliveryFeeKobo) : "Free"}</small>
                    </span>
                  </label>
                  <label className="t13-choice" data-checked={effective === "pickup"}>
                    <input type="radio" name="method" value="pickup" checked={effective === "pickup"} onChange={() => setMethod("pickup")} />
                    <span>
                      <b>Pickup</b>
                      <small>Free</small>
                    </span>
                  </label>
                </div>
              ) : null}
              {effective === "delivery" ? (
                <label className="t13-field">
                  <span>Delivery address</span>
                  <textarea
                    className="t13-input"
                    name="address"
                    rows={3}
                    maxLength={ADDRESS_MAX}
                    autoComplete="street-address"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.address}
                    aria-describedby={desc("address")}
                  />
                  <FieldError id="t13-err-address" message={errors.address} />
                </label>
              ) : shop.settings.pickupNote ? (
                <p className="t13-note">{shop.settings.pickupNote}</p>
              ) : null}
              <label className="t13-field">
                <span>Notes (optional)</span>
                <textarea
                  className="t13-input"
                  name="notes"
                  rows={2}
                  maxLength={NOTES_MAX}
                  aria-invalid={!!errors.notes}
                  aria-describedby={desc("notes")}
                />
                <FieldError id="t13-err-notes" message={errors.notes} />
              </label>
            </fieldset>

            {formError ? (
              <div className="t13-form-error" role="alert">
                <p>{formError}</p>
                {Object.keys(problems).length ? (
                  <p>
                    <Link href={`${shopHref(baseUrl)}/cart`}>Review your bag</Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="t13-fieldset">
              <h2 className="t13-fs-h">
                <span className="t13-mono t13-fs-n">03</span> Payment
              </h2>
              <p className="t13-fine" role="status">
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

          <aside className="t13-summary" aria-label="Order summary">
            <h2 className="t13-sum-title">Your order</h2>
            <CartLines rows={rows} serverProblems={problems} readOnly />
            <p className="t13-sum-row t13-mono">
              <span>Subtotal</span>
              <b>{formatNaira(subtotal)}</b>
            </p>
            <p className="t13-sum-row t13-mono">
              <span>{effective === "pickup" ? "Pickup" : "Delivery"}</span>
              <b>{fee > 0 ? formatNaira(fee) : "Free"}</b>
            </p>
            <p className="t13-sum-row t13-sum-total t13-mono">
              <span>Total</span>
              <b>{formatNaira(total)}</b>
            </p>
            {card ? (
              <>
                <button type="submit" form="t13-checkout-form" className="t13-pill t13-pill-lg t13-add" disabled={busy}>
                  {redirecting ? "Taking you to Paystack" : busy ? "Please wait" : "Pay with Paystack"}
                  {!busy ? <IconArrow size={18} /> : null}
                </button>
              </>
            ) : null}
            <WhatsAppOrderButton
              rows={rows}
              label={card ? "Finish on WhatsApp instead" : "Send order on WhatsApp"}
              className={card ? undefined : "t13-pill t13-pill-lg t13-add t13-wa"}
              deliveryMethod={effective}
              deliveryKobo={fee}
              getDetails={formDetails}
            />
            <Link className="t13-text-btn t13-center" href={`${shopHref(baseUrl)}/cart`}>
              Edit bag
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
