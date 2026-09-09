"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CardIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { CartLine } from "@/lib/cart/types";
import { checkoutAppearance, checkoutFonts } from "./stripeAppearance";

/**
 * The payment half of 05 Checkout.
 *
 * README: "Payment is a Stripe element; style it to the input token, do not
 * rebuild it." So this mounts Stripe's Payment Element and dresses it through
 * the Appearance API (see `stripeAppearance.ts`) rather than reimplementing a
 * card form.
 *
 * Two things shape the structure:
 *
 *  1. `useStripe` / `useElements` only work inside `<Elements>`, but the Pay
 *     button lives in the checkout's one `<form>`. Rather than hoist every
 *     contact and shipping field into a new wrapper — which would remount and
 *     wipe what the shopper typed the moment the client secret arrived — the
 *     confirm call is exposed upward as an imperative handle. `CheckoutView`
 *     keeps its form, its validation and its submit; it just calls
 *     `paymentRef.current.confirm(...)` at the end of it.
 *
 *  2. `<Elements options.clientSecret>` is fixed at creation, so the provider
 *     is keyed on the secret and only mounts once there is one.
 *
 * Nothing here degrades into a fake card form. With no publishable key —
 * local dev, a preview with no env — the section says so plainly and the Pay
 * button goes disabled, because inputs that encrypt nothing and post nowhere
 * are the one thing worse than an empty panel on a payment screen.
 */

/**
 * Inlined at build time by Next, so it must be read as a full literal
 * expression and not destructured or looked up dynamically.
 */
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/** Stripe.js is fetched once per page load, not once per mount. */
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  if (!PUBLISHABLE_KEY) return null;
  stripePromise ??= loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export type PaymentStatus = "unconfigured" | "loading" | "ready" | "error";

export interface PaymentConfirmDetails {
  email: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export type PaymentConfirmResult = { ok: true } | { ok: false; message: string };

export interface PaymentSectionHandle {
  confirm(details: PaymentConfirmDetails): Promise<PaymentConfirmResult>;
}

interface PaymentSectionProps {
  lines: CartLine[];
  /** Cents the summary is showing, cross-checked against the server's figure. */
  expectedAmount: number;
  /** Submit-time error, owned by `CheckoutView` alongside the field errors. */
  error?: string;
  onStatusChange: (status: PaymentStatus) => void;
}

const GENERIC_DECLINE = "That card was declined. Try another card or payment method.";
const GENERIC_NETWORK = "We couldn't reach the payment service. Check your connection and try again.";

/* ------------------------------------------------------------------ */
/* PaymentIntent                                                       */
/* ------------------------------------------------------------------ */

interface IntentState {
  status: PaymentStatus;
  clientSecret?: string;
  message?: string;
}

/** A settled fetch, tagged with the request payload it answered. */
interface IntentResult {
  /** Reference identity of the memoised payload this result belongs to. */
  request: object;
  clientSecret?: string;
  message?: string;
}

/**
 * Asks the server for a client secret. The body carries slugs, variants and
 * quantities only — the amount is the server's to compute, and the figure it
 * returns is checked against the total on screen so a cart persisted from
 * before a price change can't quietly charge a different number than it shows.
 *
 * State here is deliberately one value: the settled result, tagged with the
 * request that produced it. "Loading", "unconfigured" and "error" are then
 * *derived* rather than written, which is what keeps every `setState` in this
 * hook on the far side of an `await` — no synchronous effect-body writes, so
 * no cascading render on mount and none of the stale-result races a separate
 * status flag invites.
 */
function usePaymentIntent(
  lines: CartLine[],
  expectedAmount: number,
  enabled: boolean,
): IntentState {
  const payload = useMemo(
    () => lines.map((l) => ({ slug: l.slug, variantId: l.variantId, qty: l.qty })),
    [lines],
  );

  const [result, setResult] = useState<IntentResult | null>(null);

  useEffect(() => {
    // Nothing to ask for: no key, or a cart that hasn't hydrated yet.
    if (!enabled || payload.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/checkout/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: payload }),
          signal: controller.signal,
        });
        const data: unknown = await res.json().catch(() => null);
        if (cancelled) return;

        const record = (typeof data === "object" && data !== null ? data : {}) as {
          clientSecret?: unknown;
          amount?: unknown;
          error?: unknown;
        };

        if (!res.ok || typeof record.clientSecret !== "string") {
          setResult({
            request: payload,
            message: typeof record.error === "string" ? record.error : GENERIC_NETWORK,
          });
          return;
        }

        // The server's amount is authoritative; this only checks that what
        // the shopper is looking at agrees with what will be charged.
        if (typeof record.amount === "number" && record.amount !== expectedAmount) {
          setResult({
            request: payload,
            message: "Your cart total changed. Refresh the page to see the new total.",
          });
          return;
        }

        setResult({ request: payload, clientSecret: record.clientSecret });
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setResult({ request: payload, message: GENERIC_NETWORK });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [payload, expectedAmount, enabled]);

  if (!enabled) return { status: "unconfigured" };

  // A result for an older cart is not a result for this one.
  const current = result && result.request === payload ? result : null;
  if (!current) return { status: "loading" };
  if (current.clientSecret) return { status: "ready", clientSecret: current.clientSecret };
  return { status: "error", message: current.message ?? GENERIC_NETWORK };
}

/* ------------------------------------------------------------------ */
/* The element itself                                                  */
/* ------------------------------------------------------------------ */

interface FieldsProps {
  onElementReady: () => void;
  onLoadError: (message: string) => void;
}

const PaymentFields = forwardRef<PaymentSectionHandle, FieldsProps>(function PaymentFields(
  { onElementReady, onLoadError },
  ref,
) {
  const stripe = useStripe();
  const elements = useElements();

  useImperativeHandle(
    ref,
    (): PaymentSectionHandle => ({
      async confirm(details) {
        if (!stripe || !elements) {
          return { ok: false, message: "Payment is still loading — give it a second and try again." };
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          // Inline confirmation. The PaymentIntent is created with
          // `allow_redirects: "never"`, so nothing offered here can leave the
          // page, and the order flow below stays exactly where it was.
          redirect: "if_required",
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: details.name,
                email: details.email,
                address: {
                  line1: details.line1,
                  line2: details.line2 || undefined,
                  city: details.city,
                  state: details.state,
                  postal_code: details.zip,
                  country: "US",
                },
              },
            },
          },
        });

        if (error) {
          // `card_error` and `validation_error` carry copy meant for the
          // shopper; anything else is ours to phrase.
          const shoppable = error.type === "card_error" || error.type === "validation_error";
          return { ok: false, message: (shoppable && error.message) || GENERIC_DECLINE };
        }

        if (
          paymentIntent &&
          (paymentIntent.status === "succeeded" ||
            paymentIntent.status === "processing" ||
            paymentIntent.status === "requires_capture")
        ) {
          return { ok: true };
        }

        return { ok: false, message: GENERIC_DECLINE };
      },
    }),
    [stripe, elements],
  );

  return (
    <PaymentElement
      options={{
        layout: "tabs",
        // Name, email and address are already collected by the contact and
        // shipping sections above; asking for them twice is the "foreign
        // widget dropped into the page" failure. They are passed through on
        // confirm instead.
        fields: {
          billingDetails: { name: "never", email: "never", address: "never" },
        },
      }}
      // `onReady` fires once the element is mounted and interactive, which is
      // the only definition of "ready" the Pay button should trust.
      onReady={() => onElementReady()}
      onLoadError={({ error }) => onLoadError(error.message || GENERIC_NETWORK)}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export const PaymentSection = forwardRef<PaymentSectionHandle, PaymentSectionProps>(
  function PaymentSection({ lines, expectedAmount, error, onStatusChange }, ref) {
    const stripe = getStripe();
    const intent = usePaymentIntent(lines, expectedAmount, !!stripe);

    // The element mounts a beat after the client secret lands and is not
    // usable until it does — so "ready" is the element's word, not the
    // fetch's. Both flags are stored *as the secret they belong to* rather
    // than as booleans reset by an effect: a new secret rebuilds the Elements
    // provider, and tagging makes the stale value fall out on its own.
    const [readyFor, setReadyFor] = useState<string | null>(null);
    const [loadErrorFor, setLoadErrorFor] = useState<{ secret: string; message: string } | null>(
      null,
    );

    const secret = intent.clientSecret;
    const onElementReady = useCallback(() => setReadyFor(secret ?? null), [secret]);
    const onLoadError = useCallback(
      (message: string) => {
        if (secret) setLoadErrorFor({ secret, message });
      },
      [secret],
    );

    const elementReady = !!secret && readyFor === secret;
    const loadError = secret && loadErrorFor?.secret === secret ? loadErrorFor.message : null;

    const status: PaymentStatus = loadError
      ? "error"
      : intent.status === "ready"
        ? elementReady
          ? "ready"
          : "loading"
        : intent.status;

    useEffect(() => {
      onStatusChange(status);
    }, [status, onStatusChange]);

    const options = useMemo<StripeElementsOptions | null>(
      () =>
        intent.clientSecret
          ? {
              clientSecret: intent.clientSecret,
              appearance: checkoutAppearance,
              fonts: checkoutFonts,
              // Stripe's own skeleton covers the gap between the provider
              // mounting and the element being interactive, so there is no
              // second loading treatment stacked on top of it.
              loader: "always",
            }
          : null,
      [intent.clientSecret],
    );

    const blockingMessage = loadError ?? (intent.status === "error" ? intent.message : undefined);

    // The element's own inputs already carry the base-300 border, so it sits
    // unboxed exactly like the Contact and Shipping fields above it — a
    // second frame around it is what would make it read as a foreign widget.
    // The two states with no element to show keep the box, because a bare
    // sentence under a section legend has nothing holding it to the page.
    return (
      <div className="flex flex-col gap-3">
        {!stripe ? (
          <BareNotice>
            Payment isn&apos;t configured yet, so no card can be taken on this build. The Stripe
            element mounts here once a publishable key is set.
          </BareNotice>
        ) : blockingMessage ? (
          <BareNotice tone="error">{blockingMessage}</BareNotice>
        ) : null}

        {stripe && !blockingMessage ? (
          options ? (
            // Keyed on the secret: `clientSecret` is fixed for the life of an
            // Elements instance, so a new one needs a new provider.
            <Elements key={options.clientSecret} stripe={stripe} options={options}>
              <PaymentFields ref={ref} onElementReady={onElementReady} onLoadError={onLoadError} />
            </Elements>
          ) : (
            // Before the client secret lands there is no element to load, so
            // this stands in at the input token's dimensions.
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[13px] w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )
        ) : null}

        {error && (
          <p role="alert" className="text-[12px] font-normal leading-4 text-accent-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

/**
 * The card-icon notice the placeholder used, kept for the two states with no
 * element to show. It keeps the boxed treatment — 1px base-300, squared,
 * white fill, the input token — so the section still occupies the space the
 * element would have, rather than collapsing to a floating sentence.
 */
function BareNotice({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "error";
}) {
  const isError = tone === "error";
  return (
    <p
      role={isError ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 border border-base-300 bg-white p-4 text-[13px] leading-[18px]",
        isError ? "text-accent-600" : "text-ink-600",
      )}
    >
      <CardIcon
        size={16}
        className={cn("mt-px shrink-0", isError ? "text-accent-600" : "text-ink-600")}
      />
      <span>{children}</span>
    </p>
  );
}
