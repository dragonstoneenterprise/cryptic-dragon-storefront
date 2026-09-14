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
  title: "Barkstash",
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
        {/*
          Buy Me a Coffee's widget script calls document.writeln internally,
          which browsers block for any script that wasn't parser-inserted
          synchronously — that rules out next/script (every strategy defers
          or async-loads). A plain, server-rendered <script> tag lands in
          the initial HTML as a real parser-inserted script, so the
          document.write succeeds. Confirmed against the vendor script's
          source before making this call.

          This is necessarily a synchronous, render-blocking script — async
          or defer would reintroduce the document.write failure, since that
          restriction targets async-flagged scripts specifically. Disabling
          the lint rule here rather than the widget not working at all.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          type="text/javascript"
          src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
          data-name="bmc-button"
          data-slug="wilsonlife"
          data-color="#FFDD00"
          data-emoji="☕"
          data-font="Cookie"
          data-text="Coffee keeps me going ☕"
          data-outline-color="#000000"
          data-font-color="#000000"
          data-coffee-color="#ffffff"
        />
      </body>
    </html>
  );
}
