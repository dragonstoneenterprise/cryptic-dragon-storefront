import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { computeTotals } from "@/lib/cart/totals";
import type { CartTotals } from "@/lib/cart/types";
import { decodeCartMetadata, priceLines } from "@/lib/checkout/cartLines";
import { arrivalWindow } from "@/lib/dates";
import { renderOrderReceipt } from "@/lib/email/orderReceipt";
import type { Order, ShippingAddress } from "@/lib/order";
import { orderNumberFromIntent } from "@/lib/order";

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
 */

export const runtime = "nodejs";

/** Stripe object ids are `pi_` plus base62; anything else is not worth a
 * network call. */
const INTENT_ID = /^pi_[A-Za-z0-9]{8,255}$/;

/** Written by `app/api/checkout/payment-intent`. An intent from some other
 * integration sharing this Stripe account is not ours to email about. */
const SOURCE = "barkstash-storefront";

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

function readIntentId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const id = (body as { paymentIntentId?: unknown }).paymentIntentId;
  if (typeof id !== "string" || !INTENT_ID.test(id)) return null;
  return id;
}

/**
 * The address the parcel is going to. `shipping` is set on the intent at
 * confirm time by `PaymentSection`; billing details are the fallback for an
 * intent confirmed before that, since this checkout collects one address and
 * sends it as both.
 */
function shippingAddressFrom(
  intent: Stripe.PaymentIntent,
  billing: Stripe.PaymentMethod.BillingDetails | null,
): ShippingAddress | null {
  const source = intent.shipping?.address ? intent.shipping : billing;
  const address = source?.address;
  if (!address?.line1 || !address.city || !address.state || !address.postal_code) return null;
  return {
    name: source?.name || billing?.name || "",
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    zip: address.postal_code,
  };
}

/** The totals recorded against the charge, if they are all present and add
 * up to what Stripe captured. */
function storedTotals(
  metadata: Stripe.Metadata,
  count: number,
  amount: number,
): CartTotals | null {
  const read = (key: string) => {
    const raw = metadata[key];
    if (typeof raw !== "string") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const subtotal = read("subtotal");
  const shipping = read("shipping");
  const tax = read("tax");
  const total = read("total");
  if (subtotal === null || shipping === null || tax === null || total === null) return null;
  if (Math.round(total * 100) !== amount) return null;
  return { subtotal, shipping, tax, total, count };
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

  const decoded = decodeCartMetadata(metadata);
  if (typeof decoded === "string") {
    console.error(`[receipt] ${paymentIntentId}: ${decoded}`);
    return fail("We couldn't rebuild that order to email it.", 422);
  }

  // Re-priced from the catalogue, not from anything stored as money.
  const lines = priceLines(decoded);
  if (typeof lines === "string") {
    console.error(`[receipt] ${paymentIntentId}: ${lines}`);
    return fail("We couldn't rebuild that order to email it.", 422);
  }

  const paymentMethod =
    intent.payment_method && typeof intent.payment_method !== "string"
      ? intent.payment_method
      : null;
  const billing = paymentMethod?.billing_details ?? null;

  // The one place the recipient can come from. Never the request body.
  const email = intent.receipt_email ?? billing?.email ?? null;
  if (!email) {
    console.error(`[receipt] ${paymentIntentId}: no email on the payment`);
    return fail("That payment has no email address to send a receipt to.", 422);
  }

  const address = shippingAddressFrom(intent, billing);
  if (!address) {
    console.error(`[receipt] ${paymentIntentId}: no usable address on the payment`);
    return fail("That payment has no address to print on a receipt.", 422);
  }

  const computed = computeTotals(lines);
  const totals = storedTotals(metadata, computed.count, intent.amount) ?? {
    ...computed,
    // The grand total is the one number that has to be true, and the truth is
    // what Stripe captured — a catalogue price that moved between the charge
    // and this email must not restate what the customer was billed.
    total: intent.amount / 100,
  };

  const order: Order = {
    number: orderNumberFromIntent(intent.id),
    email,
    lines,
    totals,
    address,
    // Anchored to when the order was placed, not when this ran.
    arriving: arrivalWindow(new Date(intent.created * 1000)),
  };

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
