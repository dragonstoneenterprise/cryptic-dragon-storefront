import type { Metadata } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";

/**
 * Two families, both Google Fonts, both `display: swap` per README
 * "Typography" and the performance budget.
 *
 *  - Archivo (400/500/600/700/800) — all UI, body, labels, prices, numerals.
 *  - Instrument Serif (400 + italic) — display, section headings, plate
 *    numerals, pull quotes.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cryptic Dragon",
  description:
    "Six shelves of dog and cat accessories — walking, toys, grooming, rest, apparel, feeding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base-0 font-sans text-body text-ink-600">
        {children}
      </body>
    </html>
  );
}
