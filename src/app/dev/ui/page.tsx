import { notFound } from "next/navigation";

import Gallery from "./Gallery";

/** Dev-only gallery of the koi UI primitives (no login needed). Disabled in production. */
export default function DevUiGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
