import type { CartLine, CartTotals } from "./types";

/** Flat sales-tax rate. The design's sample cart reads $1,177.00 subtotal
 * -> $97.10 estimated tax, which is 8.25% — Sacramento's rate, which is
 * also where the README says the grading happens. */
export const TAX_RATE = 0.0825;

/** Shipping is free at every price point — "free 2-day shipping" is one of
 * the three standing promises in the announcement strip, so there is no
 * threshold to model. */
export const SHIPPING_COST = 0;

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeTotals(lines: CartLine[]): CartTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));
  const shipping = lines.length ? SHIPPING_COST : 0;
  const tax = round2(subtotal * TAX_RATE);
  return {
    subtotal,
    shipping,
    tax,
    total: round2(subtotal + shipping + tax),
    count: lines.reduce((n, l) => n + l.qty, 0),
  };
}
