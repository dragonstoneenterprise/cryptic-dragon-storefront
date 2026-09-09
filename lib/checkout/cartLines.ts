import type { CartLine } from "@/lib/cart/types";
import { lineKey } from "@/lib/cart/types";
import { getProductBySlug, isSoldOut, sizeOptions } from "@/lib/products";

/**
 * Turning identity-only cart lines into priced ones, plus the encoding that
 * carries them on a PaymentIntent's metadata.
 *
 * This lives outside the two routes that use it for the reason the checkout
 * route already states about `computeTotals`: the pricing rule must have one
 * implementation, imported, so the amount the shopper is charged and the
 * amount their receipt itemises cannot drift apart. Both
 * `app/api/checkout/payment-intent` (which creates the intent) and
 * `app/api/checkout/send-receipt` (which emails what was bought) call
 * `priceLines`, and neither ever reads a price off the wire.
 *
 * Server-only: `lib/products` is the catalogue module and is imported by
 * Server Components and route handlers.
 */

/** More lines than the catalogue can produce; a bound, not a business rule. */
export const MAX_LINES = 60;

/**
 * The stock ceiling `PdpBuyPanel` applies when a product has no explicit
 * `stockRemaining`. Mirrored here so the server's quantity bound is the same
 * one the buy panel enforced client-side.
 */
export const FALLBACK_MAX_QTY = 10;

/** The sentinel a one-size product carries, per `lib/cart/types`. */
export const ONE_SIZE = "one-size";

export interface RequestLine {
  slug: string;
  variantId?: string;
  qty: number;
}

/** `PdpBuyPanel` writes `variantId` as the slugified size label. */
export function variantIdFor(size: string) {
  return size.toLowerCase().replace(/\s+/g, "-");
}

export function parseLines(body: unknown): RequestLine[] | string {
  if (typeof body !== "object" || body === null) return "We couldn't read that cart.";
  const raw = (body as { lines?: unknown }).lines;
  if (!Array.isArray(raw)) return "We couldn't read that cart.";
  if (raw.length === 0) return "There's nothing in this cart to pay for.";
  if (raw.length > MAX_LINES) return "That's more items than we can check out at once.";

  const lines: RequestLine[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return "We couldn't read that cart.";
    const { slug, variantId, qty } = entry as Record<string, unknown>;
    if (typeof slug !== "string" || !slug) return "We couldn't read that cart.";
    if (variantId !== undefined && typeof variantId !== "string") {
      return "We couldn't read that cart.";
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
      return "One of those quantities doesn't look right.";
    }
    lines.push({ slug, variantId, qty });
  }
  return lines;
}

/**
 * Turn identity-only lines into fully priced cart lines using the catalogue
 * as the only source of price and stock. Returns a message string on
 * rejection.
 */
export function priceLines(requested: RequestLine[]): CartLine[] | string {
  const priced: CartLine[] = [];
  const seen = new Set<string>();

  for (const line of requested) {
    const product = getProductBySlug(line.slug);
    if (!product) return "One of those items is no longer in the shop.";
    if (isSoldOut(product)) return `${product.name} is closed — take it out of your cart to check out.`;

    const sizes = sizeOptions(product);
    const variantId = line.variantId ?? ONE_SIZE;
    let variant: string;
    if (sizes.length === 0) {
      if (variantId !== ONE_SIZE) return `${product.name} doesn't come in sizes.`;
      variant = "One size";
    } else {
      const match = sizes.find((size) => variantIdFor(size) === variantId);
      if (!match) return `That size isn't available for ${product.name}.`;
      variant = match;
    }

    // Two lines for the same product+size would let a caller double a
    // quantity past the stock ceiling one line at a time.
    const key = lineKey(product.slug, variantId);
    if (seen.has(key)) return "That cart has the same item listed twice.";
    seen.add(key);

    const maxQty = product.stockRemaining ?? FALLBACK_MAX_QTY;
    if (line.qty > maxQty) {
      return `We only have ${maxQty} of ${product.name} left.`;
    }

    priced.push({
      key,
      productId: product.slug,
      slug: product.slug,
      name: product.name,
      variant,
      variantId,
      qty: line.qty,
      // The price the shop charges, not the price the caller claimed.
      unitPrice: product.price,
      compareAtPrice: product.compareAtPrice,
      maxQty,
    });
  }

  return priced;
}

/* ------------------------------------------------------------------ */
/* PaymentIntent metadata                                              */
/* ------------------------------------------------------------------ */

/**
 * The cart is written onto the intent as `slug/variantIdxqty` entries joined
 * by commas — identity and quantity only, never money, exactly as it arrived
 * on the wire. The receipt route re-prices it through `priceLines` above, so
 * a stored line is no more trusted than a posted one.
 *
 * Stripe caps a metadata *value* at 500 characters, which a 60-line cart can
 * exceed, so the string is chunked across a handful of keys. Chunking is by
 * whole entry: a half-written entry that silently changed what someone was
 * billed for on their receipt is exactly the failure this format exists to
 * avoid. `cart` stays the first key so intents created before this change
 * still decode.
 */
const CART_KEY_PREFIX = "cart";
const CART_VALUE_LIMIT = 500;
const CART_MAX_CHUNKS = 5;

function cartKey(index: number) {
  return index === 0 ? CART_KEY_PREFIX : `${CART_KEY_PREFIX}${index + 1}`;
}

/**
 * `{ cart: "a/bx1,c/dx2", cart2: "…" }`. Entries past the last chunk are
 * dropped rather than truncated mid-entry — with `MAX_LINES` at 60 and five
 * 500-character chunks that cannot happen for any cart this shop can build,
 * but the encoder is written so the failure mode is "fewer lines" and never
 * "a wrong line".
 */
export function encodeCartMetadata(lines: CartLine[]): Record<string, string> {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const entry = `${line.slug}/${line.variantId}x${line.qty}`;
    // Entry plus the comma that would join it to what is already there.
    const next = current ? `${current},${entry}` : entry;
    if (next.length <= CART_VALUE_LIMIT) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    if (chunks.length >= CART_MAX_CHUNKS) return toRecord(chunks.slice(0, CART_MAX_CHUNKS));
    // A single entry longer than the limit is not representable; skipping it
    // is wrong either way, so let it start a chunk and be caught on decode.
    current = entry;
  }
  if (current) chunks.push(current);

  return toRecord(chunks.slice(0, CART_MAX_CHUNKS));
}

function toRecord(chunks: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  chunks.forEach((chunk, i) => {
    record[cartKey(i)] = chunk;
  });
  return record;
}

/** `slug/variant-idxQTY`. Both `.+` are greedy, so the split lands on the
 * last `/` and the last `x` — sizes like "XS" slugify to `xs` and would
 * otherwise be cut in half. */
const ENTRY = /^(.+)\/(.+)x(\d+)$/;

/**
 * Read the cart back off an intent's metadata. Returns a message string when
 * the metadata is absent or unreadable — the receipt route treats that as
 * "don't send anything", never as "send something approximate".
 */
export function decodeCartMetadata(
  metadata: Record<string, string> | null | undefined,
): RequestLine[] | string {
  if (!metadata) return "That order has no cart recorded against it.";

  let joined = "";
  for (let i = 0; i < CART_MAX_CHUNKS; i += 1) {
    const chunk = metadata[cartKey(i)];
    if (typeof chunk !== "string" || !chunk) break;
    joined = joined ? `${joined},${chunk}` : chunk;
  }
  if (!joined) return "That order has no cart recorded against it.";

  const lines: RequestLine[] = [];
  for (const raw of joined.split(",")) {
    const match = ENTRY.exec(raw);
    if (!match) return "That order's cart couldn't be read.";
    const qty = Number(match[3]);
    if (!Number.isInteger(qty) || qty < 1) return "That order's cart couldn't be read.";
    lines.push({ slug: match[1], variantId: match[2], qty });
  }
  if (lines.length === 0 || lines.length > MAX_LINES) return "That order's cart couldn't be read.";

  return lines;
}
