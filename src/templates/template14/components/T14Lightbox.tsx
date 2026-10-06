"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { IconChevron, IconClose } from "../icons";
import { useFocusTrap } from "../shop/useFocusTrap";

export type LightboxImage = { url: string; alt: string };

/**
 * Full-screen photo viewer. Mount it only while open: it traps focus, closes on Escape,
 * steps with the arrow keys and hands focus back to whatever opened it.
 */
export default function T14Lightbox({
  images,
  startAt,
  portalTo,
  onClose,
}: {
  images: LightboxImage[];
  startAt: number;
  portalTo: HTMLElement;
  onClose: () => void;
}) {
  const [i, setI] = useState(Math.min(Math.max(0, startAt), images.length - 1));
  const ref = useFocusTrap<HTMLDivElement>(onClose, ".t14-lb-close");
  const n = images.length;
  const step = (d: number) => setI((cur) => (cur + d + n) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const img = images[i];
  if (!img) return null;
  return createPortal(
    <div className="t14-lb" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="t14-lb-box" role="dialog" aria-modal="true" aria-label="Photo viewer" tabIndex={-1}>
        <button type="button" className="t14-lb-close" onClick={onClose} aria-label="Close photo viewer">
          <IconClose size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="t14-lb-img" src={img.url} alt={img.alt || `Photo ${i + 1}`} />
        <p className="t14-lb-cap" aria-live="polite">
          {img.alt ? `${img.alt} · ` : ""}
          {i + 1} of {n}
        </p>
        {n > 1 ? (
          <>
            <button type="button" className="t14-lb-nav t14-lb-prev" onClick={() => step(-1)} aria-label="Previous photo">
              <IconChevron size={20} />
            </button>
            <button type="button" className="t14-lb-nav t14-lb-next" onClick={() => step(1)} aria-label="Next photo">
              <IconChevron size={20} />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    portalTo,
  );
}
