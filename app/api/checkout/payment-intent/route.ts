import { NextResponse } from "next/server";
import Stripe from "stripe";
import { computeTotals } from "@/lib/cart/totals";
import { encodeCartMetadata, parseLines, priceLines } from "@/lib/checkout/cartLines";
import { getAuthenticatedUser } from "@/lib/supabase/server";

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
 *
 * The priced cart is also written onto the intent's `metadata`, in the same
 * identity-and-quantity form it arrived in. That is what lets
 * `app/api/checkout/send-receipt` itemise a confirmation email from the
 * intent alone, without a word of the order coming from whoever asks for the
 * email. See `lib/checkout/cartLines.ts` for the encoding.
 *
 * **Who the order belongs to is also decided here**, and this is the only
 * place it can be. If the request carries a valid Supabase session, the
 * user's id is stamped onto the intent's metadata as `user_id`; if it does
 * not, nothing is stamped and the order is a guest order. The id comes from
 * `getAuthenticatedUser()`, which validates the session token with the Auth
 * server — it is never read from the request body, which has no field for it.
 *
 * Doing it at creation rather than at record time is what makes ownership
 * unforgeable. `app/api/checkout/record-order` reads the owner back off the
 * Stripe object, which only this route could have written, so possessing a
 * PaymentIntent id is not the same as being entitled to the order it names.
 * Someone replaying another shopper's intent id learns nothing and claims
 * nothing.
 */

export const runtime = "nodejs";

const CURRENCY = "usd";

/** Stripe rejects USD charges under $0.50. */
const MIN_AMOUNT_CENTS = 50;

/** A 400 the client can render verbatim. */
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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

  // Who is checking out, if anyone. Null is the ordinary case — a guest —
  // and never an error: a shopper without an account must be able to buy
  // exactly as they could before accounts existed. This also returns null on
  // a deployment with no Supabase env, which is the same path.
  const buyer = await getAuthenticatedUser();

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
        // The buyer, when there is one. Server-written from a validated
        // session and read back by `record-order` as the order's owner.
        // Omitted entirely for a guest, so `user_id` on the order row stays
        // null and the order belongs to no account.
        ...(buyer ? { user_id: buyer.id } : {}),
        // Identity and quantity per line, chunked across `cart`, `cart2`…
        // because Stripe caps a metadata value at 500 characters. The receipt
        // route re-prices these against the catalogue; nothing here is
        // trusted as money on the way back out.
        ...encodeCartMetadata(priced),
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
