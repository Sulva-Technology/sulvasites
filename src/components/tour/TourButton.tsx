"use client";

import { useTour } from "./TourProvider";

export function TourButton() {
  const tour = useTour();
  if (!tour) return null;
  return (
    <button
      type="button"
      data-tour="tour-button"
      onClick={tour.start}
      aria-label="Take the tour"
      className="koi-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px] font-semibold">
        ?
      </span>
      <span className="sr-only sm:not-sr-only">Tour</span>
    </button>
  );
}
