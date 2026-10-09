import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter_Tight, Instrument_Serif } from "next/font/google";

// Fonts are exposed as CSS variables only; the koi admin UI opts in via
// `font-sans` / `font-serif`. Public template sites keep their own fonts.
const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com"}`),
  title: "Sulva Sites",
  description: "Websites for Nigerian businesses, by Sulvatech.",
  // Config icons, not app/icon.svg: file-based icons would override every customer site's own favicon.
  icons: {
    icon: [
      { url: "/brand/sulva-icon.svg", type: "image/svg+xml" },
      { url: "/brand/sulva-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/brand/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
