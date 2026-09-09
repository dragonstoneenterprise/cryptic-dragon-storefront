import { NextResponse } from "next/server";
import Stripe from "stripe";
import { computeTotals } from "@/lib/cart/totals";
import type { CartLine } from "@/lib/cart/types";
import { lineKey } from "@/lib/cart/types";
import { getProductBySlug, isSoldOut, sizeOptions } from "@/lib/products";

/**
 * POST /api/checkout/payment-intent
 *
 * Creates a Stripe PaymentIntent for the caller's cart and hands back the
 * client secret.
 *
 * The single load-bearing rule here: **the request body carries identity and
 * quantity, never money.** The client posts `{ slug, variantId, qty }` per
 * line; every price is looked up from `lib/products.ts` on this side of the
 * wire and the total is computed by `computeTotals` — the same function the
 * cart UI renders from, imported rather than re-implemented so the two can
 * not drift. A body containing an `amount`, `price` or `total` field is
 * simply ignored: there is no code path that reads one.
 *
 * The secret key is read inside the handler rather than at module scope so a
 * build without Stripe configured (local dev, a preview with no env) still
 * compiles and boots — only a request to this route fails, with a 503 that
 * says why.
 */

export const runtime = "nodejs";

const CURRENCY = "usd";

/** Stripe rejects USD charges under $0.50. */
const MIN_AMOUNT_CENTS = 50;

/** More lines than the catalogue can produce; a bound, not a business rule. */
const MAX_LINES = 60;

/**
 * The stock ceiling `PdpBuyPanel` applies when a product has no explicit
 * `stockRemaining`. Mirrored here so the server's quantity bound is the same
 * one the buy panel enforced client-side.
 */
const FALLBACK_MAX_QTY = 10;

/** The sentinel a one-size product carries, per `lib/cart/types`. */
const ONE_SIZE = "one-size";

interface RequestLine {
  slug: string;
  variantId?: string;
  qty: number;
}

/** A 400 the client can render verbatim. */
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** `PdpBuyPanel` writes `variantId` as the slugified size label. */
function variantIdFor(size: string) {
  return size.toLowerCase().replace(/\s+/g, "-");
}

function parseLines(body: unknown): RequestLine[] | string {
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
 * Turn the request's identity-only lines into fully priced cart lines using
 * the catalogue as the only source of price and stock. Returns a message
 * string on rejection.
 */
function priceLines(requested: RequestLine[]): CartLine[] | string {
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

export async function POST(request: Request) {
  // Read inside the handler: a missing key must fail this request, not the build.
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^(sk|rk)_/.test(secretKey)) {
    return NextResponse.json(
      { error: "Payment isn't configured yet — no card can be taken right now." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("We couldn't read that cart.");
  }

  const requested = parseLines(body);
  if (typeof requested === "string") return badRequest(requested);

  const priced = priceLines(requested);
  if (typeof priced === "string") return badRequest(priced);

  // Same tax and shipping arithmetic the cart, checkout and confirmation
  // screens render — one implementation, imported.
  const totals = computeTotals(priced);
  const amount = Math.round(totals.total * 100);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT_CENTS) {
    return badRequest("That order is below the minimum we can charge.");
  }

  const stripe = new Stripe(secretKey);

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      // No redirect-based methods: this checkout confirms inline and writes
      // its receipt to sessionStorage before routing to /order/confirmation,
      // so there is no return_url handler for a method that leaves the page.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: `Barkstash order — ${totals.count} item${totals.count === 1 ? "" : "s"}`,
      metadata: {
        source: "barkstash-storefront",
        cart: priced
          .map((l) => `${l.slug}/${l.variantId}x${l.qty}`)
          .join(",")
          .slice(0, 500),
        subtotal: totals.subtotal.toFixed(2),
        shipping: totals.shipping.toFixed(2),
        tax: totals.tax.toFixed(2),
        total: totals.total.toFixed(2),
      },
    });

    if (!intent.client_secret) {
      return NextResponse.json(
        { error: "We couldn't start that payment. Try again in a moment." },
        { status: 502 },
      );
    }

    // `amount` goes back so the client can check it against the total it is
    // showing and refuse to submit if a stored cart has gone stale. It is a
    // display cross-check, never an input — the charge is the amount above.
    return NextResponse.json({
      clientSecret: intent.client_secret,
      amount,
      currency: CURRENCY,
    });
  } catch (err) {
    console.error("[checkout] PaymentIntent creation failed:", err);
    return NextResponse.json(
      { error: "We couldn't start that payment. Try again in a moment." },
      { status: 502 },
    );
  }
}
