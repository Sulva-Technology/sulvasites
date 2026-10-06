"use client";

import Link from "next/link";

import { buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT14 } from "../ctx";
import { IconChat, IconPercent } from "../icons";
import { dealProducts } from "../shop/helpers";

/**
 * Floating bottom-left pill: "Deals · n" when products are on sale, else a WhatsApp chat link.
 * Hidden while the cart drawer is open and on checkout and order views. On phones it lifts above the
 * sticky cart bar when that bar is showing.
 */
export default function T14FloatPill() {
  const { shop, baseUrl, profile, cart, cartOpen, shopViewKind } = useT14();
  if (!shop || cartOpen || shopViewKind === "checkout" || shopViewKind === "order") return null;

  const deals = dealProducts(shop).length;
  const lifted = cart.ready && cart.count > 0 && shopViewKind !== "cart";

  if (deals > 0) {
    return (
      <Link className="t14-floatpill" data-lift={lifted} href={`${shopHref(baseUrl)}?sale=1`}>
        <span className="t14-floatpill-ico">
          <IconPercent size={14} />
        </span>
        Deals · {deals}
      </Link>
    );
  }
  if (profile.whatsapp) {
    return (
      <a className="t14-floatpill" data-lift={lifted} href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
        <span className="t14-floatpill-ico">
          <IconChat size={14} />
        </span>
        Chat on WhatsApp
      </a>
    );
  }
  return null;
}
