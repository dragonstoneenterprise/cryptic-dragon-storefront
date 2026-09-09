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

/**
 * Shape check for a line that came back from storage.
 *
 * A stored cart is user-writable data wherever it is kept — localStorage on
 * the device, or a `carts` row the user's own token can edit — so both
 * readers validate rather than cast. It is a guard against a malformed or
 * stale row reaching the render tree, not a security control: nothing here
 * is trusted as money. Every path that charges (`payment-intent`), emails
 * (`send-receipt`) or records (`record-order`) re-prices from the catalogue
 * and reads no price off a stored line.
 */
export function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<CartLine>;
  return (
    typeof c.key === "string" &&
    typeof c.productId === "string" &&
    typeof c.name === "string" &&
    typeof c.qty === "number" &&
    c.qty > 0 &&
    typeof c.unitPrice === "number"
  );
}

/**
 * Fold a guest's device cart into the one stored against their account.
 *
 * A union, not a replacement, and not a sum. Someone who filled a cart while
 * signed out and then signed in should find both carts' items waiting — but
 * quantities take the larger of the two rather than adding them, because the
 * same cart merging twice must not quietly double what someone is about to
 * buy. The line's own stock ceiling still caps the result.
 */
export function mergeCartLines(base: CartLine[], incoming: CartLine[]): CartLine[] {
  const merged = base.map((line) => ({ ...line }));
  const byKey = new Map(merged.map((line) => [line.key, line]));

  for (const line of incoming) {
    const existing = byKey.get(line.key);
    if (existing) {
      existing.qty = Math.min(existing.maxQty, Math.max(existing.qty, line.qty));
    } else {
      const copy = { ...line };
      merged.push(copy);
      byKey.set(copy.key, copy);
    }
  }
  return merged;
}
