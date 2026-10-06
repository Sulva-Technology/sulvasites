"use client";

import type { MouseEvent } from "react";

import {
  buildWhatsAppOrderLink,
  buildWhatsAppOrderMessage,
  type WhatsAppOrderDetails,
} from "@/lib/shop/whatsappOrder";
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

/** Sends the bag to the business on WhatsApp, pre-typed, for shoppers who'd rather finish the order in chat. */
export default function WhatsAppOrderButton({
  rows,
  className = "t13-pill t13-pill-glass t13-pill-lg t13-wa",
  label = "Order on WhatsApp",
  deliveryMethod,
  deliveryKobo,
  getDetails,
  onNavigate,
}: Props) {
  const { profile, baseUrl } = useT13();
  const orderable = rows.filter((r) => r.product && r.problem === null);

  const build = (origin: string | null, details?: WhatsAppOrderDetails) =>
    buildWhatsAppOrderLink(
      profile.whatsapp,
      buildWhatsAppOrderMessage({
        businessName: profile.business_name,
        items: orderable.map((r) => ({
          name: r.product!.name,
          variantLabel: r.variant ? Object.values(r.variant.options).join(" / ") : null,
          quantity: r.line.quantity,
          unitKobo: r.unitKobo,
          lineTotalKobo: r.totalKobo,
          url: origin ? `${origin}${productHref(baseUrl, r.product!)}` : null,
        })),
        subtotalKobo: orderable.reduce((n, r) => n + r.totalKobo, 0),
        deliveryMethod: deliveryMethod ?? null,
        deliveryKobo: deliveryKobo ?? null,
        customer: details ?? null,
      }),
    );

  const href = build(null);
  if (!href || orderable.length === 0) return null;

  // Rebuild on click so the message carries product links and the latest checkout details.
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const fresh = build(window.location.origin, getDetails?.());
    if (fresh) e.currentTarget.href = fresh;
    onNavigate?.();
  };

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick}>
      <IconChat size={18} /> {label}
    </a>
  );
}
