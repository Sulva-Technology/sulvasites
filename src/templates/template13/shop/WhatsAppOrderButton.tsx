"use client";

import { useRef, useState, type MouseEvent } from "react";

import {
  buildWhatsAppOrderLink,
  buildWhatsAppOrderMessage,
  type WhatsAppOrderDetails,
  type WhatsAppOrderInput,
} from "@/lib/shop/whatsappOrder";
import { registerWhatsAppOrder } from "@/lib/shop/whatsappOrderClient";
import { orderWhatsApp } from "@/lib/shop/checkoutMode";
import { useT13 } from "../ctx";
import { IconChat } from "../icons";
import { productHref, type ResolvedLine } from "./helpers";

type Props = {
  rows: ResolvedLine[];
  className?: string;
  label?: string;
  deliveryMethod?: "delivery" | "pickup";
  deliveryKobo?: number;
  /** Read at click time (e.g. what the shopper has typed into checkout so far). */
  getDetails?: () => WhatsAppOrderDetails;
  onNavigate?: () => void;
};

/**
 * Sends the bag to the business on WhatsApp, pre-typed, for shoppers who'd rather finish the order in chat.
 * The bag is first recorded as a pending WhatsApp order (its reference goes in the message) so the owner
 * can find it under Orders and mark it completed. If that fails, WhatsApp still opens without a reference.
 * Hidden when the shop's checkout mode is card-only or no WhatsApp number is set.
 */
export default function WhatsAppOrderButton({
  rows,
  className = "t13-pill t13-pill-glass t13-pill-lg t13-wa",
  label = "Order on WhatsApp",
  deliveryMethod,
  deliveryKobo,
  getDetails,
  onNavigate,
}: Props) {
  const { profile, baseUrl, siteId, shop } = useT13();
  const whatsapp = orderWhatsApp(shop?.settings, profile.whatsapp);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const orderable = rows.filter((r) => r.product && r.problem === null);

  const urlOf = (origin: string | null, productId: string) => {
    const p = orderable.find((r) => r.product!.id === productId)?.product;
    return origin && p ? `${origin}${productHref(baseUrl, p)}` : null;
  };

  const localMessage = (origin: string | null, details?: WhatsAppOrderDetails): WhatsAppOrderInput => ({
    businessName: profile.business_name,
    items: orderable.map((r) => ({
      name: r.product!.name,
      variantLabel: r.variant ? Object.values(r.variant.options).join(" / ") : null,
      quantity: r.line.quantity,
      unitKobo: r.unitKobo,
      lineTotalKobo: r.totalKobo,
      url: urlOf(origin, r.product!.id),
    })),
    subtotalKobo: orderable.reduce((n, r) => n + r.totalKobo, 0),
    deliveryMethod: deliveryMethod ?? null,
    deliveryKobo: deliveryKobo ?? null,
    customer: details ?? null,
  });

  const href = buildWhatsAppOrderLink(whatsapp, buildWhatsAppOrderMessage(localMessage(null)));
  if (!href || orderable.length === 0) return null;

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    // Open the tab now, inside the click, so popup blockers allow it; it's pointed at WhatsApp below.
    const win = window.open("", "_blank");
    if (win) win.opener = null;

    const origin = window.location.origin;
    const details = getDetails?.();
    const order = await registerWhatsAppOrder(siteId, {
      lines: orderable.map((r) => r.line),
      deliveryMethod: deliveryMethod ?? null,
      customer: details ? { name: details.name ?? "", email: details.email ?? "", phone: details.phone ?? "" } : undefined,
      address: details?.address ?? null,
      notes: details?.notes ?? null,
    });

    const message: WhatsAppOrderInput = order
      ? {
          businessName: profile.business_name,
          reference: order.reference,
          items: order.items.map((i) => ({ ...i, url: urlOf(origin, i.productId) })),
          subtotalKobo: order.subtotalKobo,
          deliveryMethod: order.deliveryMethod ?? "agree",
          deliveryKobo: order.deliveryKobo,
          customer: details ?? null,
        }
      : localMessage(origin, details);
    const link = buildWhatsAppOrderLink(whatsapp, buildWhatsAppOrderMessage(message)) ?? href;

    if (win && !win.closed) win.location.href = link;
    else window.location.href = link;
    busy.current = false;
    setPending(false);
    onNavigate?.();
  };

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick} aria-busy={pending}>
      <IconChat size={18} /> {pending ? "Opening WhatsApp…" : label}
    </a>
  );
}
