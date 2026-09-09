import type { Appearance } from "@stripe/stripe-js";

/**
 * The Payment Element is drawn inside a Stripe-hosted iframe, so it cannot
 * see Tailwind or the `@theme` tokens. The README is explicit that payment
 * "is a Stripe element; style it to the input token, do not rebuild it", so
 * the token values are restated here in the one form the iframe can read —
 * Stripe's Appearance API.
 *
 * Every literal below is a token from `tailwind.config.ts`, not a new value:
 * base-300 borders, ink-900 on focus, accent-600 on error, the 10px/0.22em
 * uppercase label, and radius 0 everywhere (radius is binary in this system
 * and the element is not one of the two circles).
 */

const INK_900 = "#18140F";
const INK_600 = "#5C544A";
const INK_400 = "#8B8175";
const BASE_300 = "#D6CEC2";
const ACCENT_600 = "#7A1F3D";
const WHITE = "#FFFFFF";

/** 13px padding + 20px line-height + 2 × 1px border = the 48px input token. */
const INPUT_PADDING = "13px 16px";

export const checkoutAppearance: Appearance = {
  theme: "stripe",
  labels: "above",
  variables: {
    fontFamily: 'Archivo, system-ui, sans-serif',
    fontSizeBase: "15px",
    fontWeightNormal: "400",
    fontWeightMedium: "500",
    fontWeightBold: "600",
    borderRadius: "0px",
    spacingUnit: "4px",
    spacingGridRow: "16px",
    colorPrimary: INK_900,
    colorBackground: WHITE,
    colorText: INK_900,
    colorTextSecondary: INK_600,
    colorTextPlaceholder: INK_400,
    colorDanger: ACCENT_600,
    colorIcon: INK_600,
    // The input token says "no default outline"; focus is carried by the
    // border colour alone.
    focusBoxShadow: "none",
    focusOutline: "none",
  },
  rules: {
    ".Input": {
      backgroundColor: WHITE,
      border: `1px solid ${BASE_300}`,
      borderRadius: "0",
      boxShadow: "none",
      padding: INPUT_PADDING,
      fontSize: "15px",
      lineHeight: "20px",
      color: INK_900,
    },
    ".Input:hover": {
      border: `1px solid ${BASE_300}`,
    },
    ".Input:focus": {
      border: `1px solid ${INK_900}`,
      boxShadow: "none",
      outline: "none",
    },
    ".Input--invalid": {
      border: `1px solid ${ACCENT_600}`,
      boxShadow: "none",
      color: INK_900,
    },
    ".Input--invalid:focus": {
      border: `1px solid ${ACCENT_600}`,
      boxShadow: "none",
    },
    ".Input::placeholder": {
      color: INK_400,
    },
    ".Label": {
      fontSize: "10px",
      lineHeight: "13px",
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      fontWeight: "500",
      color: INK_900,
      marginBottom: "8px",
    },
    ".Error": {
      fontSize: "12px",
      lineHeight: "16px",
      color: ACCENT_600,
      marginTop: "6px",
    },
    ".Tab": {
      backgroundColor: WHITE,
      border: `1px solid ${BASE_300}`,
      borderRadius: "0",
      boxShadow: "none",
      color: INK_600,
    },
    ".Tab:hover": {
      border: `1px solid ${BASE_300}`,
      boxShadow: "none",
      color: INK_900,
    },
    ".Tab--selected": {
      backgroundColor: WHITE,
      border: `1px solid ${INK_900}`,
      boxShadow: "none",
      color: INK_900,
    },
    ".Tab--selected:focus": {
      border: `1px solid ${INK_900}`,
      boxShadow: "none",
      outline: "none",
    },
    ".TabLabel": {
      fontSize: "13px",
      lineHeight: "18px",
      fontWeight: "500",
    },
    ".TabIcon--selected": {
      color: INK_900,
    },
    ".Block": {
      backgroundColor: WHITE,
      border: `1px solid ${BASE_300}`,
      borderRadius: "0",
      boxShadow: "none",
    },
    ".AccordionItem": {
      backgroundColor: WHITE,
      border: `1px solid ${BASE_300}`,
      borderRadius: "0",
      boxShadow: "none",
    },
    ".CheckboxInput": {
      backgroundColor: WHITE,
      border: `1px solid ${BASE_300}`,
      borderRadius: "0",
      boxShadow: "none",
    },
    ".CheckboxInput--checked": {
      backgroundColor: INK_900,
      border: `1px solid ${INK_900}`,
    },
  },
};

/**
 * Archivo again, this time fetched by the iframe. `next/font` inlines the
 * family into the parent document only, so without this the element would
 * fall back to system-ui and read as a foreign widget.
 */
export const checkoutFonts = [
  {
    cssSrc: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap",
  },
];
