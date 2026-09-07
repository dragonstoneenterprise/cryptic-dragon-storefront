/** Shared money formatting. Kept in one place so the cart, PDP, listing and
 * checkout all agree on how a price is spelled. */

/**
 * The catalogue is priced in whole dollars and the design writes prices that
 * way throughout — "$18", "$34 from $44", "Save $10", never "$18.00". So
 * cents show only when there are cents to show, which keeps a tax or
 * shipping line ("$3.06") honest without putting ".00" on every plate.
 */
export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function percentOff(price: number, compareAtPrice?: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) return undefined;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
