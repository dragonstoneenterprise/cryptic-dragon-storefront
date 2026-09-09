import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { renderOrderReceipt } from "@/lib/email/orderReceipt";
import { SOURCE, readIntentId, rebuildOrderFromIntent } from "@/lib/checkout/intentOrder";

/**
 * POST /api/checkout/send-receipt
 *
 * Emails the order confirmation for a payment that has already succeeded.
 *
 * **The request body carries one string: a PaymentIntent id.** Nothing else
 * is read from it, and there is no code path that could read one — no line
 * items, no totals, no address, and above all no recipient. That is the
 * whole security design of this route. An endpoint that mailed a receipt
 * assembled from its request body would be a free, branded, domain-verified
 * mailer for anyone who found the URL; instead every word of the email is
 * reconstructed on this side from the intent:
 *
 *   - the payment is retrieved from Stripe with the secret key and must come
 *     back `status === "succeeded"` — an id that does not exist, or exists
 *     and was never paid, sends nothing;
 *   - the recipient is the address on the payment's own billing details (or
 *     `receipt_email`), so a receipt can only ever go to the person who paid;
 *   - the line items come from the cart recorded in the intent's metadata at
 *     creation time, and are re-priced from `lib/products.ts` on the way out,
 *     exactly as they were re-priced on the way in;
 *   - the totals are the ones recorded against the charge, cross-checked
 *     against `intent.amount` — the figure Stripe actually captured.
 *
 * Replay is bounded too: the first successful send stamps `receipt_sent_at`
 * onto the intent's metadata, and a second call for the same intent returns
 * without sending. Without that, anyone holding a valid id could mail-bomb
 * the customer by hitting this route in a loop. (Two genuinely simultaneous
 * calls could both pass the check before either stamps; the client fires
 * this once, and a duplicate receipt is a far cheaper failure than a
 * receipt that never arrives, so the stamp is written after the send rather
 * than before it.)
 *
 * Both keys are read inside the handler, never at module scope, so a build
 * with neither configured still compiles and boots — the same rule
 * `app/api/checkout/payment-intent` follows.
 *
 * The reconstruction itself — decode the cart, re-price it, read the
 * recipient, the address and the totals off the payment — now lives in
 * `lib/checkout/intentOrder.ts`, because `app/api/checkout/record-order`
 * has to produce the identical order to write to the database. One
 * implementation, imported by both, so a customer's receipt and their order
 * history cannot describe different purchases. The gates below are unchanged
 * and stay here, since the two routes report them differently.
 */

export const runtime = "nodejs";

/** Set on the intent once its receipt has gone out. */
const SENT_MARKER = "receipt_sent_at";

const DEFAULT_FROM = "Barkstash <orders@barkstash.com>";

/** Nothing identifying comes back: the caller proved only that it knows an
 * id, so it learns only that the send happened. */
type Result =
  | { sent: true }
  | { sent: false; reason: "already_sent" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * The 422s this route can produce, phrased for the shopper-facing case.
 * `rebuildOrderFromIntent` returns a diagnostic string; it is logged, and
 * mapped to one of these rather than echoed, because the caller may be
 * someone who only guessed an id.
 */
function rebuildFailure(reason: string) {
  if (reason.includes("no email")) {
    return fail("That payment has no email address to send a receipt to.", 422);
  }
  if (reason.includes("no usable address")) {
    return fail("That payment has no address to print on a receipt.", 422);
  }
  return fail("We couldn't rebuild that order to email it.", 422);
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^(sk|rk)_/.test(secretKey)) {
    // Without the secret key there is no way to verify the payment, and an
    // unverified receipt is precisely the thing this route must not send.
    return fail("Receipts aren't configured — the payment couldn't be verified.", 503);
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return fail("Email isn't configured on this deployment, so no receipt was sent.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("We couldn't read that request.", 400);
  }

  const paymentIntentId = readIntentId(body);
  if (!paymentIntentId) return fail("That isn't a payment we can look up.", 400);

  const stripe = new Stripe(secretKey);

  let intent: Stripe.PaymentIntent;
  try {
    // The payment method carries the billing details the recipient is taken
    // from, so it is expanded rather than fetched separately.
    intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      // A well-formed id that is not a payment on this account.
      return fail("That isn't a payment we can look up.", 404);
    }
    console.error("[receipt] PaymentIntent lookup failed:", err);
    return fail("We couldn't reach the payment service.", 502);
  }

  // The gate. Everything below this line describes a payment that Stripe
  // says has actually been captured.
  if (intent.status !== "succeeded") {
    return fail("That payment hasn't completed, so there's no receipt to send.", 409);
  }

  const metadata = intent.metadata ?? {};
  if (metadata.source !== SOURCE) {
    return fail("That isn't a payment we can look up.", 404);
  }

  if (metadata[SENT_MARKER]) {
    const already: Result = { sent: false, reason: "already_sent" };
    return NextResponse.json(already);
  }

  const rebuilt = rebuildOrderFromIntent(intent);
  if (typeof rebuilt === "string") {
    console.error(`[receipt] ${paymentIntentId}: ${rebuilt}`);
    return rebuildFailure(rebuilt);
  }

  const { order } = rebuilt;
  const email = order.email;

  const { subject, html, text } = renderOrderReceipt(order);

  try {
    const resend = new Resend(resendKey);
    const replyTo = process.env.RECEIPT_REPLY_TO;
    const { error } = await resend.emails.send({
      from: process.env.RECEIPT_FROM_EMAIL || DEFAULT_FROM,
      to: email,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
      // Resend's own idempotency window, on top of the metadata marker: a
      // retried request for the same order will not produce a second send.
      headers: { "X-Entity-Ref-ID": intent.id },
    });

    if (error) {
      console.error(`[receipt] ${paymentIntentId}: Resend rejected the send:`, error);
      return fail("We couldn't send that receipt.", 502);
    }
  } catch (err) {
    console.error(`[receipt] ${paymentIntentId}: send failed:`, err);
    return fail("We couldn't send that receipt.", 502);
  }

  try {
    await stripe.paymentIntents.update(intent.id, {
      metadata: { [SENT_MARKER]: new Date().toISOString() },
    });
  } catch (err) {
    // The email is already out. Failing the request now would tell the
    // caller to retry and send a second one, which is the worse outcome.
    console.error(`[receipt] ${paymentIntentId}: couldn't stamp the sent marker:`, err);
  }

  const sent: Result = { sent: true };
  return NextResponse.json(sent);
}
