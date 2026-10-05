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
  title: "Sulva Sites",
  description: "Sulvatech internal website builder",
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
