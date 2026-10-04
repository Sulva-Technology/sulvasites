"use client";

import Link from "next/link";

import { formatNaira } from "@/lib/shop/money";
import { useT13 } from "../ctx";
import { IconMinus, IconPlus, IconTrash } from "../icons";
import { productHref, variantLabelOf, type ResolvedLine } from "./helpers";

export type LineProblem = { reason: string; available?: number };

const REASONS: Record<string, string> = {
  unavailable: "No longer available",
  out_of_stock: "Sold out",
  sold_out: "Sold out",
  insufficient_stock: "Not enough in stock",
  variant_required: "Choose a size or colour again",
  invalid_quantity: "Quantity not available",
};

function problemText(p: LineProblem): string {
  if (p.reason === "insufficient_stock" && typeof p.available === "number") {
    return p.available > 0 ? `Only ${p.available} left. Reduce the quantity.` : "Sold out";
  }
  return REASONS[p.reason] ?? "This item has a problem";
}

/** The bag's lines: photo, name, variant, quantity stepper, remove and line total. */
export default function CartLines({
  rows,
  onNavigate,
  serverProblems,
  readOnly = false,
}: {
  rows: ResolvedLine[];
  /** Called when a product link is followed (the drawer closes itself). */
  onNavigate?: () => void;
  /** Per-line problems returned by checkout, keyed by line index. */
  serverProblems?: Record<number, LineProblem>;
  readOnly?: boolean;
}) {
  const { baseUrl, announce, cart } = useT13();

  return (
    <ul className="t13-lines">
      {rows.map((r) => {
        const name = r.product?.name ?? "This item";
        const img = r.product?.images[0];
        const label = variantLabelOf(r.variant);
        const server = serverProblems?.[r.index];
        const problem: LineProblem | null = server ?? (r.problem ? { reason: r.problem } : null);
        const atMax = r.maxQty !== null && r.line.quantity >= r.maxQty;
        return (
          <li key={`${r.line.productId}-${r.line.variantId ?? "x"}`} className="t13-line" data-problem={!!problem}>
            <div className="t13-line-media">
              {img && r.product ? (
                <Link href={productHref(baseUrl, r.product)} onClick={onNavigate} tabIndex={-1} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" />
                </Link>
              ) : (
                <span className="t13-line-noimg" aria-hidden="true" />
              )}
            </div>
            <div className="t13-line-main">
              <p className="t13-line-name">
                {r.product ? (
                  <Link href={productHref(baseUrl, r.product)} onClick={onNavigate}>
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </p>
              {label ? <p className="t13-line-variant">{label}</p> : null}
              {r.problem !== "unavailable" ? <p className="t13-line-unit">{formatNaira(r.unitKobo)}</p> : null}
              {problem ? (
                <p className="t13-line-problem" role="alert">
                  {problemText(problem)}
                </p>
              ) : null}
              {!readOnly ? (
                <div className="t13-line-actions">
                  {r.problem !== "unavailable" && r.problem !== "sold_out" ? (
                    <div className="t13-stepper" role="group" aria-label={`Quantity of ${name}`}>
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${name}`}
                        onClick={() => {
                          cart.setQty(r.index, r.line.quantity - 1);
                          announce(r.line.quantity <= 1 ? `${name} removed from your bag` : `Quantity of ${name}: ${r.line.quantity - 1}`);
                        }}
                      >
                        <IconMinus size={14} />
                      </button>
                      <span className="t13-stepper-n" aria-live="polite" aria-atomic="true">
                        {r.line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${name}`}
                        disabled={atMax}
                        onClick={() => {
                          cart.setQty(r.index, r.line.quantity + 1);
                          announce(`Quantity of ${name}: ${r.line.quantity + 1}`);
                        }}
                      >
                        <IconPlus size={14} />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="t13-link-btn"
                    aria-label={`Remove ${name} from bag`}
                    onClick={() => {
                      cart.remove(r.index);
                      announce(`${name} removed from your bag`);
                    }}
                  >
                    <IconTrash size={15} /> Remove
                  </button>
                </div>
              ) : (
                <p className="t13-line-qty">Qty {r.line.quantity}</p>
              )}
            </div>
            <p className="t13-line-total">{r.problem === "unavailable" ? "" : formatNaira(r.totalKobo)}</p>
          </li>
        );
      })}
    </ul>
  );
}
