/**
 * A cart line, shaped as README "State" specifies:
 *   line items (id, variant, qty, price snapshot), subtotal, shipping, total.
 *
 * The price is snapshotted onto the line rather than looked up from the
 * catalogue, so the cart stays honest if the listing changes underneath it.
 *
 * `variantId` is the size axis where a product has one (README "Variants":
 * collar 12–20 in, bolster bed three sizes, cooling mat two, the two coats
 * five each). One-size products carry the single sentinel `"one-size"`,
 * which is also why they hide the selector rather than showing a single
 * disabled cell.
 */
export interface CartLine {
  /** Stable identity for the line: product slug + variant. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  /** Human-readable variant, e.g. "Medium". */
  variant: string;
  variantId: string;
  qty: number;
  /** Price snapshot at the moment it went in the cart. */
  unitPrice: number;
  compareAtPrice?: number | null;
  /** Units available, so the stepper can't outrun stock. */
  maxQty: number;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  count: number;
}

export function lineKey(productId: string, variantId: string) {
  return `${productId}::${variantId}`;
}
