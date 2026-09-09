import type Stripe from "stripe";
import { computeTotals } from "@/lib/cart/totals";
import type { CartTotals } from "@/lib/cart/types";
import { decodeCartMetadata, priceLines } from "@/lib/checkout/cartLines";
import { arrivalWindow } from "@/lib/dates";
import type { Order, ShippingAddress } from "@/lib/order";
import { orderNumberFromIntent } from "@/lib/order";

/**
 * Rebuilding an order from a PaymentIntent that Stripe says was paid.
 *
 * Two routes need to do this and they must agree exactly: `send-receipt`
 * emails the order, `record-order` writes it to the database. If they
 * reconstructed it separately, a customer's receipt and their order history
 * could describe different purchases — the same class of drift
 * `lib/checkout/cartLines.ts` exists to prevent between the charge and the
 * receipt. So it is one implementation, imported by both, exactly as
 * `priceLines` is.
 *
 * Everything here derives from the Stripe object. Nothing derives from a
 * request body — the callers only ever hand this an intent they retrieved
 * themselves with the secret key. In particular the shopper's email, their
 * address, the line items and the amount are all read off the payment, which
 * is what lets both routes accept a bare id from an unauthenticated caller
 * without that caller being able to influence a single word of the result.
 *
 * The callers own the two gates — `status === "succeeded"` and the `source`
 * check — because they report them with different status codes. This module
 * assumes both have already passed.
 */

/** Stripe object ids are `pi_` plus base62; anything else is not worth a
 * network call. */
export const INTENT_ID = /^pi_[A-Za-z0-9]{8,255}$/;

/** Written by `app/api/checkout/payment-intent`. An intent from some other
 * integration sharing this Stripe account is not ours to act on. */
export const SOURCE = "barkstash-storefront";

/** The one field either route reads from a request body. */
export function readIntentId(body: unknown): string | null {
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
export function shippingAddressFrom(
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
export function storedTotals(
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

/** The payment method carries the billing details, when it was expanded. */
export function billingDetailsFrom(
  intent: Stripe.PaymentIntent,
): Stripe.PaymentMethod.BillingDetails | null {
  const paymentMethod =
    intent.payment_method && typeof intent.payment_method !== "string"
      ? intent.payment_method
      : null;
  return paymentMethod?.billing_details ?? null;
}

export interface RebuiltOrder {
  order: Order;
  /**
   * The account this order belongs to, or null for a guest.
   *
   * Read from metadata written by `payment-intent` at creation time from a
   * validated session — never from the caller of whichever route is asking.
   * See that route's header for why ownership is decided there.
   */
  userId: string | null;
}

/**
 * Rebuild the order, or return a message explaining why it cannot be.
 *
 * Callers log the message; none of these are safe to hand a caller verbatim,
 * since the caller may be someone who merely guessed an id.
 */
export function rebuildOrderFromIntent(intent: Stripe.PaymentIntent): RebuiltOrder | string {
  const metadata = intent.metadata ?? {};

  const decoded = decodeCartMetadata(metadata);
  if (typeof decoded === "string") return decoded;

  // Re-priced from the catalogue, not from anything stored as money.
  const lines = priceLines(decoded);
  if (typeof lines === "string") return lines;

  const billing = billingDetailsFrom(intent);

  // The one place the recipient can come from. Never a request body.
  const email = intent.receipt_email ?? billing?.email ?? null;
  if (!email) return "no email on the payment";

  const address = shippingAddressFrom(intent, billing);
  if (!address) return "no usable address on the payment";

  const computed = computeTotals(lines);
  const totals = storedTotals(metadata, computed.count, intent.amount) ?? {
    ...computed,
    // The grand total is the one number that has to be true, and the truth is
    // what Stripe captured — a catalogue price that moved between the charge
    // and this read must not restate what the customer was billed.
    total: intent.amount / 100,
  };

  const rawUserId = metadata.user_id;
  const userId = typeof rawUserId === "string" && UUID.test(rawUserId) ? rawUserId : null;

  return {
    order: {
      number: orderNumberFromIntent(intent.id),
      email,
      lines,
      totals,
      address,
      // Anchored to when the order was placed, not when this ran.
      arriving: arrivalWindow(new Date(intent.created * 1000)),
    },
    userId,
  };
}

/** Shape check on the stamped id. It is server-written, so this is a
 * guard against a malformed write, not against a hostile one — but a
 * non-uuid reaching a uuid column is a 500 nobody needs. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
