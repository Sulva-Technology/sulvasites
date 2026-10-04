"use client";

import Link from "next/link";

import { buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT13 } from "../ctx";
import { IconClose } from "../icons";
import { useFocusTrap } from "./useFocusTrap";

const MEASURE: Array<[string, string]> = [
  ["Bust / chest", "Around the fullest part, keeping the tape level under your arms."],
  ["Waist", "Around the narrowest part of your waist, over the navel."],
  ["Hips", "Around the fullest part of your hips, feet together."],
  ["Length", "Compare with a similar piece you already own and love the fit of."],
];

/**
 * Size-guide drawer. Shows the site's own size or fit rich text when there is one (from any page),
 * else a "how to measure" table with no measurements invented, plus a way to ask the business.
 */
export default function SizeGuide({ onClose }: { onClose: () => void }) {
  const { sizeGuideHtml, hasSizeGuidePage, baseUrl, profile } = useT13();
  const ref = useFocusTrap<HTMLElement>(onClose, "[data-autofocus]");

  return (
    <div className="t13-drawer-root">
      <div className="t13-scrim" onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className="t13-drawer t13-drawer-wide" role="dialog" aria-modal="true" aria-labelledby="t13-sg-title" tabIndex={-1}>
        <header className="t13-drawer-head">
          <h2 id="t13-sg-title" className="t13-drawer-title">
            Size guide
          </h2>
          <button type="button" className="t13-icon-btn" aria-label="Close size guide" onClick={onClose} data-autofocus>
            <IconClose />
          </button>
        </header>
        <div className="t13-drawer-body t13-sg">
          {sizeGuideHtml ? (
            <div className="t13-prose" dangerouslySetInnerHTML={{ __html: sizeGuideHtml }} />
          ) : (
            <>
              <p>
                Sizes can vary between styles, so check the product details too. Measure yourself, then compare with the
                size notes on the product.
              </p>
              <table className="t13-table">
                <caption className="t13-sr">How to measure</caption>
                <thead>
                  <tr>
                    <th scope="col">Measure</th>
                    <th scope="col">How</th>
                  </tr>
                </thead>
                <tbody>
                  {MEASURE.map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="t13-fine">Between sizes or unsure? Ask us before you order.</p>
          <div className="t13-actions">
            {hasSizeGuidePage ? (
              <Link className="t13-btn t13-btn-ghost" href={`${baseUrl}/p/size-guide`} onClick={onClose}>
                Full size guide page
              </Link>
            ) : null}
            {profile.whatsapp ? (
              <a className="t13-btn t13-btn-ghost" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                WhatsApp us
              </a>
            ) : profile.phone ? (
              <a className="t13-btn t13-btn-ghost" href={buildTelLink(profile.phone)}>
                Call {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
