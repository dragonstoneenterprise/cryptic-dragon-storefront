import { NextResponse } from "next/server";
import Stripe from "stripe";
import { SOURCE, readIntentId, rebuildOrderFromIntent } from "@/lib/checkout/intentOrder";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { toJson } from "@/lib/supabase/database.types";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * POST /api/checkout/record-order
 *
 * Writes the durable order row for a payment that has already succeeded.
 *
 * This is the sibling of `send-receipt` and it is built to the same rule:
 * **the request body carries one string, a PaymentIntent id.** No line items,
 * no totals, no address, no email, and no user id. There is no code path that
 * reads one, because the body is passed to `readIntentId` and nothing else.
 * Everything written to the database is reconstructed on this side from the
 * payment itself, through the same `rebuildOrderFromIntent` the receipt email
 * is rendered from — so an order row and its receipt cannot describe
 * different purchases.
 *
 * The verification chain, in the order it runs, so it can be checked:
 *
 *   1. `STRIPE_SECRET_KEY` must be present. Without it there is no way to
 *      verify a payment, and an unverified order is precisely the thing this
 *      route must not write. 503 rather than a guess.
 *   2. The id must match `^pi_[A-Za-z0-9]{8,255}$` — otherwise no network
 *      call is made at all.
 *   3. The PaymentIntent is **retrieved from Stripe with the secret key**.
 *      Nothing about it is taken from the caller.
 *   4. `intent.status === "succeeded"`. This is the gate. An id that does not
 *      exist, or exists and was never paid, writes nothing. Identical to the
 *      check `send-receipt` makes before it will send anything.
 *   5. `metadata.source` must be `barkstash-storefront`, so an unrelated
 *      payment sharing this Stripe account cannot become an order here.
 *   6. The amount written is cross-checked against `intent.amount`, the
 *      figure Stripe actually captured, and the line items are re-priced from
 *      `lib/products.ts` rather than read as money from anywhere.
 *
 * **Ownership.** `user_id` comes from the intent's own metadata, stamped by
 * `app/api/checkout/payment-intent` at creation time from a session it
 * validated. It is not taken from this request, which is what stops a
 * PaymentIntent id from doubling as a claim ticket: someone who came by
 * another shopper's id cannot POST it while signed in and pull that order —
 * with its address and email — into their own history. Ownership was settled
 * before the card was charged.
 *
 * There is one narrow fallback, for the shopper who reaches checkout as a
 * guest and signs in before paying — their intent was created without a
 * user_id. In that case the *validated* session on this request may adopt the
 * order, but only if that account's email matches the email on the payment
 * **and** the account has confirmed that address. Both halves matter: the
 * match is the evidence, and the confirmation is what makes the match mean
 * something rather than being a claim anyone could type at signup.
 *
 * **Idempotency** is the `stripe_payment_intent_id` unique index. A second
 * POST for the same payment hits it and returns "already recorded" instead of
 * writing a duplicate — this route is fired fire-and-forget from the client,
 * so retries and double-fires are expected traffic, not anomalies.
 *
 * Nothing here is allowed to break a checkout. The client does not await it
 * and never blocks the redirect on it; every failure is logged and returned
 * as a status the caller ignores. A shopper whose order row fails to write
 * still gets their confirmation screen and their receipt email — the payment
 * is captured and the record is reconstructible from Stripe either way.
 */

export const runtime = "nodejs";

/** Nothing identifying comes back: the caller proved only that it knows an
 * id, so it learns only that the write happened. */
type Result =
  | { recorded: true }
  | { recorded: false; reason: "already_recorded" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Postgres unique_violation. Someone else recorded this order first. */
const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !/^(sk|rk)_/.test(secretKey)) {
    return fail("Orders aren't configured — the payment couldn't be verified.", 503);
  }

  // The one client in this codebase that bypasses RLS, and the only route
  // that holds it. `orders` has no client-writable policy by design, so this
  // is the sole path by which a row can exist.
  const admin = createServiceRoleClient();
  if (!admin) {
    return fail("Order storage isn't configured on this deployment.", 503);
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
    // The payment method carries the billing details the email and address
    // are taken from, so it is expanded rather than fetched separately.
    intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return fail("That isn't a payment we can look up.", 404);
    }
    console.error("[record-order] PaymentIntent lookup failed:", err);
    return fail("We couldn't reach the payment service.", 502);
  }

  // The gate. Everything below this line describes a payment that Stripe
  // says has actually been captured.
  if (intent.status !== "succeeded") {
    return fail("That payment hasn't completed, so there's no order to record.", 409);
  }

  const metadata = intent.metadata ?? {};
  if (metadata.source !== SOURCE) {
    return fail("That isn't a payment we can look up.", 404);
  }

  const rebuilt = rebuildOrderFromIntent(intent);
  if (typeof rebuilt === "string") {
    console.error(`[record-order] ${paymentIntentId}: ${rebuilt}`);
    return fail("We couldn't rebuild that order to record it.", 422);
  }

  const { order } = rebuilt;
  const userId = await resolveOwner(rebuilt.userId, order.email, paymentIntentId);

  const { error } = await admin.from("orders").insert({
    user_id: userId,
    order_number: order.number,
    stripe_payment_intent_id: intent.id,
    email: order.email,
    status: "paid",
    currency: intent.currency ?? "usd",
    subtotal: order.totals.subtotal,
    shipping: order.totals.shipping,
    tax: order.totals.tax,
    total: order.totals.total,
    item_count: order.totals.count,
    lines: toJson(order.lines),
    shipping_address: toJson(order.address),
    arriving: order.arriving,
    placed_at: new Date(intent.created * 1000).toISOString(),
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      // Expected: a retry, a double-fire, or a second tab. The order is
      // already on file, which is a success from the caller's point of view.
      const already: Result = { recorded: false, reason: "already_recorded" };
      return NextResponse.json(already);
    }
    console.error(`[record-order] ${paymentIntentId}: insert failed:`, error.message);
    return fail("We couldn't record that order.", 502);
  }

  const recorded: Result = { recorded: true };
  return NextResponse.json(recorded);
}

/**
 * Whose order this is.
 *
 * The stamped id wins outright whenever there is one — see the header. The
 * fallback below only ever runs for an intent created without one, i.e. a
 * checkout begun as a guest, and it requires the signed-in account to have
 * confirmed the very address the payment carries. A mismatch is not an
 * error: it simply means the order stays a guest order, which is a complete,
 * valid record that no account can read.
 */
async function resolveOwner(
  stampedUserId: string | null,
  paymentEmail: string,
  paymentIntentId: string,
): Promise<string | null> {
  if (stampedUserId) return stampedUserId;

  const session = await getAuthenticatedUser();
  if (!session) return null;

  if (!session.emailConfirmed) {
    console.warn(
      `[record-order] ${paymentIntentId}: session email unconfirmed, recording as guest order`,
    );
    return null;
  }

  const sameMailbox =
    typeof session.email === "string" &&
    session.email.trim().toLowerCase() === paymentEmail.trim().toLowerCase();

  if (!sameMailbox) {
    console.warn(
      `[record-order] ${paymentIntentId}: session email does not match the payment, recording as guest order`,
    );
    return null;
  }

  return session.id;
}
