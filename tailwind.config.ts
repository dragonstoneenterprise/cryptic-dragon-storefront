// Cryptic Dragon design tokens.
// Sourced verbatim from design_handoff_cryptic_dragon_storefront/tokens.json
// and tailwind.theme.extend.js.
//
// NOTE: the installed Tailwind version is v4, which is CSS-first (theme lives
// in globals.css via `@theme`) rather than JS-config-first. This file is still
// the literal home for the handoff's `theme.extend` values, and is wired in via
// the `@config` directive at the top of app/globals.css so it actually takes
// effect.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    // Radius is BINARY, and this is a hard override rather than an extend on
    // purpose. The README calls it "the single most load-bearing rule in the
    // system; a 6px or 8px radius anywhere breaks it." Overriding the namespace
    // deletes Tailwind's default scale (rounded-sm / -md / -lg / -xl / ...), so
    // an intermediate radius is not merely discouraged, it is unavailable.
    //   0     — everything: cards, plates, badges, chips, buttons, inputs, sheets, hero
    //   999px — true circles only: the confirmation check mark and the toggle knob
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
      full: "999px",
    },
    extend: {
      colors: {
        "base-0": "#FDFCFA",
        "base-50": "#F5F1EA",
        "base-100": "#F2EEE8",
        "base-200": "#E7E1D8",
        "base-300": "#D6CEC2",
        "ink-400": "#8B8175",
        "ink-600": "#5C544A",
        "ink-900": "#18140F",
        "accent-50": "#FBEAE3",
        "accent-600": "#7A1F3D",
        "accent-700": "#5A1730",
        "warn-600": "#8A6100",
        "success-50": "#E7F0EA",
        "success-600": "#2F6B4A",
        white: "#FFFFFF",
        canvas: "#E8E3DA",
      },
      // Both families load through next/font in app/layout.tsx, which exposes
      // them as CSS variables. The variable leads and the handoff's literal
      // family name follows, so the stack still degrades exactly as the spec's
      // fallback chain describes if the variable is ever absent.
      fontFamily: {
        display: ["var(--font-instrument-serif)", "Instrument Serif", "Georgia", "serif"],
        sans: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["68px", { lineHeight: "68px", letterSpacing: "-0.02em", fontWeight: "400" }],
        display: ["46px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "400" }],
        h1: ["40px", { lineHeight: "42px", letterSpacing: "-0.015em", fontWeight: "400" }],
        h2: ["34px", { lineHeight: "36px", letterSpacing: "-0.015em", fontWeight: "400" }],
        quote: ["17px", { lineHeight: "26px", fontWeight: "400" }],
        title: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        body: ["15px", { lineHeight: "26px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        label: ["10px", { lineHeight: "13px", letterSpacing: "0.22em", fontWeight: "500" }],
        "micro-nav": ["11px", { lineHeight: "14px", letterSpacing: "0.18em", fontWeight: "500" }],
        "micro-badge": ["10px", { lineHeight: "13px", letterSpacing: "0.16em", fontWeight: "500" }],
      },
      // The only two shadows in the system, both on fixed overlays (the cart
      // drawer and the sticky add-to-cart bar). A hairline, not a blur.
      boxShadow: {
        hairline: "0 -1px 0 #E7E1D8",
      },
      screens: {
        sm: "640px",
        lg: "1024px",
        xl: "1280px",
      },
      // tokens.json ships the spacing steps the design actually uses. The
      // README notes the 4px base "maps 1:1 to Tailwind's default scale", so
      // these are identity re-declarations, kept to document which steps are
      // sanctioned: 4 icon-to-text, 8 chip/badge padding, 12 grid gap, 16
      // mobile gutter, 24 desktop gutter + card padding, 32/56 section gaps.
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        14: "56px",
      },
      // Colour and border-color only, 120ms. Nothing else animates.
      transitionDuration: {
        DEFAULT: "120ms",
      },
    },
  },
};

export default config;
