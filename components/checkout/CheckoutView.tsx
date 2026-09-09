"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { getProductBySlug } from "@/lib/products";
import { TextInput } from "@/components/ui/TextInput";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listAddresses } from "@/lib/account/addresses";
import type { AddressRow } from "@/lib/supabase/database.types";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { arrivalWindow } from "@/lib/dates";
import { orderNumber, orderNumberFromIntent, saveOrder } from "@/lib/order";
import { validateAddressField, type AddressFieldId } from "@/lib/checkout/addressFields";
import { cn } from "@/lib/cn";
import { PaymentSection } from "./PaymentSection";
import type { PaymentSectionHandle, PaymentStatus } from "./PaymentSection";

/**
 * 05 Checkout. One page, no wizard (README is explicit about that).
 *
 * Validation runs **on blur, not on keystroke** — README "Interactions:
 * Form validation: on blur, not on keystroke." Submit re-validates
 * everything and focuses the first invalid field. A field that has never
 * been blurred shows no error, so typing into an empty form is silent.
 *
 * Payment is Stripe's Payment Element, mounted and dressed by
 * `PaymentSection`. Card fields are no longer part of this form's state or
 * validation: the element owns them, they never touch this origin, and the
 * amount is the one the server computed from the cart's slugs — see
 * `app/api/checkout/payment-intent/route.ts`. Submit validates contact and
 * shipping first, then confirms the payment, and only writes the order
 * snapshot once Stripe says the intent succeeded.
 *
 * The confirmation email is kicked off at the same moment and deliberately
 * not awaited — see `requestReceipt` below.
 */

type FieldId = "email" | "name" | "address1" | "address2" | "city" | "state" | "zip";

type Values = Record<FieldId, string>;

const INITIAL: Values = {
  email: "",
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

/** Order matters: submit focuses the first invalid field in this order. */
const FIELD_ORDER: FieldId[] = ["email", "name", "address1", "city", "state", "zip"];

/**
 * Ask the server to email the receipt for a payment that just succeeded, and
 * do not wait for it.
 *
 * The id is the entire request: the route re-reads the order off the
 * PaymentIntent and will not take an address, a line item or a recipient
 * from a browser. See `app/api/checkout/send-receipt/route.ts`.
 *
 * Nothing here is awaited by the caller, because a receipt that is slow to
 * send must not hold a paid shopper on the checkout screen — a failed email
 * is not a failed order, and the confirmation is theirs either way. The
 * navigation that follows is client-side so the request survives it, and
 * `keepalive` covers the shopper who closes the tab first. A failure is
 * logged rather than surfaced: there is nothing the shopper could do about
 * it, and telling them their order might not have gone through, on the one
 * screen that exists to say it did, would be a lie in the wrong direction.
 */
function requestReceipt(paymentIntentId: string) {
  fireAndForget("/api/checkout/send-receipt", paymentIntentId, "receipt email");
}

/**
 * Ask the server to write the durable order row, and do not wait for it
 * either.
 *
 * Identical shape to `requestReceipt` above, and identical reasoning: the id
 * is the entire request, the route rebuilds the order from the PaymentIntent
 * and verifies it against Stripe before writing anything, and a slow or
 * failed write must not hold a paid shopper on the checkout screen. See
 * `app/api/checkout/record-order/route.ts`.
 *
 * Worth being explicit about what a failure here costs, since it is silent:
 * the payment is captured and the receipt is sent regardless — the shopper's
 * order is real. What is lost is the row that would have made it appear in
 * their order history, and that is reconstructible from Stripe afterwards.
 * Which is exactly the trade the receipt email already makes, and the reason
 * neither is allowed to block the redirect.
 *
 * Whether the row is attached to an account is not decided here and cannot be
 * influenced from here — the browser sends no user id. Ownership was stamped
 * onto the intent when it was created.
 */
function requestOrderRecord(paymentIntentId: string) {
  fireAndForget("/api/checkout/record-order", paymentIntentId, "order record");
}

/**
 * The shared POST-an-intent-id-and-move-on. Nothing is awaited by the caller:
 * the navigation that follows is client-side so the request survives it, and
 * `keepalive` covers the shopper who closes the tab first. Failures are
 * logged rather than surfaced — there is nothing the shopper could do about
 * one, and raising it on the screen that exists to say their order went
 * through would be a lie in the wrong direction.
 */
function fireAndForget(url: string, paymentIntentId: string, label: string) {
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
    keepalive: true,
  })
    .then(async (res) => {
      if (res.ok) return;
      const data: unknown = await res.json().catch(() => null);
      const message =
        typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `HTTP ${res.status}`;
      console.error(`[checkout] ${label} failed: ${message}`);
    })
    .catch((err) => {
      console.error(`[checkout] ${label} request failed:`, err);
    });
}

/**
 * Contact is validated here; the address fields defer to
 * `lib/checkout/addressFields.ts`, which holds these exact rules and this
 * exact copy so the account's address book cannot save something this form
 * would refuse. Same "one implementation, imported" rule as `priceLines`.
 */
function validate(id: FieldId, value: string): string | undefined {
  if (id === "email") {
    const v = value.trim();
    if (!v) return "Add an email so we can send the receipt.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That doesn't look like an email address.";
    return undefined;
  }
  return validateAddressField(id as AddressFieldId, value);
}

/** The form values a saved address fills in. */
function valuesFromAddress(address: AddressRow): Partial<Values> {
  return {
    name: address.full_name,
    address1: address.line1,
    address2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    zip: address.postal_code,
  };
}

export function CheckoutView() {
  const router = useRouter();
  const { lines, hydrated, subtotal, shipping, tax, total, count, clearCart } = useCart();
  const { user, hydrated: authHydrated } = useAuth();

  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldId, boolean>>>({});
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---------------- saved addresses ---------------- */

  const [saved, setSaved] = useState<AddressRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Which saved address the fields currently reflect, for the "filled from"
   * note. Cleared the moment the shopper edits any of them. */
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  /** Prefill is a one-shot courtesy. Without this, a re-render after the
   * shopper deliberately cleared a field would helpfully put it back. */
  const prefilled = useRef(false);

  /**
   * Offer the shopper's saved details rather than making them type them
   * again — and never at the cost of the guest path. Everything below is
   * additive: with no account, no addresses, or no Supabase at all, `saved`
   * stays empty, nothing renders, and this form behaves exactly as it did
   * before accounts existed.
   *
   * The default address fills the fields once, on arrival, and only while
   * they are still untouched. That is prefilling, not forcing: every field
   * stays editable, a different saved address is one tap away, and typing
   * over any of it simply wins.
   */
  useEffect(() => {
    if (!authHydrated || !user) return;
    let active = true;

    void listAddresses().then((result) => {
      if (!active || !result.ok || result.data.length === 0) return;
      setSaved(result.data);

      if (prefilled.current) return;
      prefilled.current = true;

      const preferred = result.data.find((a) => a.is_default) ?? result.data[0];
      setValues((current) => {
        // Only fill what is still empty. A shopper who started typing before
        // this resolved must not have their work overwritten.
        const untouched = (["name", "address1", "city", "state", "zip"] as const).every(
          (id) => current[id] === "",
        );
        if (!untouched) return current;
        setFilledFrom(preferred.id);
        return {
          ...current,
          ...valuesFromAddress(preferred),
          email: current.email || user.email || "",
        };
      });
    });

    return () => {
      active = false;
    };
  }, [authHydrated, user]);

  function applyAddress(address: AddressRow) {
    setValues((v) => ({ ...v, ...valuesFromAddress(address) }));
    // The fields are known-good, so clear any errors they were showing.
    setErrors((e) => ({
      ...e,
      name: undefined,
      address1: undefined,
      city: undefined,
      state: undefined,
      zip: undefined,
    }));
    setFilledFrom(address.id);
    setPickerOpen(false);
  }

  const paymentRef = useRef<PaymentSectionHandle>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [paymentError, setPaymentError] = useState<string | undefined>();
  /**
   * Set the moment Stripe confirms. It gates a second submit against an
   * already-spent intent, and it holds the empty-cart panel back over the
   * frame where `clearCart()` has landed but the redirect hasn't.
   */
  const [paid, setPaid] = useState(false);

  function setValue(id: FieldId, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
    // Editing any address field means these are no longer the saved
    // address's values, so the "filled from" note stops claiming they are.
    // The saved address itself is untouched — checkout never writes to the
    // address book behind the shopper's back.
    if (id !== "email") setFilledFrom(null);
    // Deliberately NOT re-validating here. Once a field is showing an
    // error we do clear it as soon as the value becomes valid, because
    // leaving a stale error under a now-correct field is its own bug —
    // but a field that has never been blurred stays silent.
    if (touched[id] && errors[id] && !validate(id, value)) {
      setErrors((e) => ({ ...e, [id]: undefined }));
    }
  }

  function onBlur(id: FieldId) {
    setTouched((t) => ({ ...t, [id]: true }));
    setErrors((e) => ({ ...e, [id]: validate(id, values[id]) }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || paid) return;

    setPaymentError(undefined);

    const nextErrors: Partial<Record<FieldId, string>> = {};
    for (const id of FIELD_ORDER) nextErrors[id] = validate(id, values[id]);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((id) => [id, true])));

    // "Submit re-validates everything and focuses the first invalid
    // field." The form's own element collection is the lookup — each input
    // carries `name={id}`, so no ref map is needed.
    const firstInvalid = FIELD_ORDER.find((id) => nextErrors[id]);
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid);
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.scrollIntoView({ block: "center" });
      }
      return;
    }

    // Payment is the last gate, and it is a real one now: nothing below this
    // line runs unless Stripe reports the intent succeeded.
    const payment = paymentRef.current;
    if (paymentStatus !== "ready" || !payment) {
      setPaymentError(
        paymentStatus === "unconfigured"
          ? "Payment isn't configured on this build, so this order can't be placed."
          : paymentStatus === "error"
            ? "Payment isn't available right now. Refresh the page and try again."
            : "Payment is still loading — give it a second and try again.",
      );
      return;
    }

    setSubmitting(true);

    const result = await payment.confirm({
      email: values.email.trim(),
      name: values.name.trim(),
      line1: values.address1.trim(),
      line2: values.address2.trim() || undefined,
      city: values.city.trim(),
      state: values.state.trim().toUpperCase(),
      zip: values.zip.trim(),
    });

    if (!result.ok) {
      setPaymentError(result.message);
      setSubmitting(false);
      return;
    }

    // Paid. `submitting` deliberately stays true through the redirect so the
    // button cannot be pressed a second time against a spent intent.
    setPaid(true);

    // Fired here rather than from the confirmation screen: this is the one
    // place that knows the payment just succeeded, and neither the receipt
    // nor the order record should depend on the shopper reaching — or
    // staying on — the next route. Both are fire-and-forget, and neither is
    // allowed to delay the redirect below.
    if (result.paymentIntentId) {
      requestReceipt(result.paymentIntentId);
      requestOrderRecord(result.paymentIntentId);
    }

    saveOrder({
      // Derived from the intent so the number on screen is the number in the
      // email. Falls back to a fresh one only if Stripe confirmed without
      // handing an id back, which it does not do for an inline confirm.
      number: result.paymentIntentId
        ? orderNumberFromIntent(result.paymentIntentId)
        : orderNumber(),
      email: values.email.trim(),
      lines,
      totals: { subtotal, shipping, tax, total, count },
      address: {
        name: values.name.trim(),
        line1: [values.address1.trim(), values.address2.trim()].filter(Boolean).join(", "),
        city: values.city.trim(),
        state: values.state.trim().toUpperCase(),
        zip: values.zip.trim(),
      },
      arriving: arrivalWindow(),
    });
    clearCart();
    router.push("/order/confirmation");
  }

  const fieldProps = (id: FieldId) => ({
    name: id,
    value: values[id],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(id, e.target.value),
    onBlur: () => onBlur(id),
    error: touched[id] ? errors[id] : undefined,
  });

  // `paid` holds this panel back for the frame between `clearCart()` and the
  // route change — a shopper who has just been charged should not see "there's
  // nothing to pay for" flash past on the way to their receipt.
  if (hydrated && lines.length === 0 && !paid) {
    return (
      <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
        <h2 className="font-display text-h2 text-ink-900">There&apos;s nothing to pay for.</h2>
        <p className="text-body text-ink-600">Your cart is empty — go pick something out.</p>
        <ButtonLink href="/category/all" className="mt-1">
          Start browsing
        </ButtonLink>
      </div>
    );
  }

  const summary = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow
          label="Shipping"
          value={shipping === 0 ? <span className="font-semibold text-success-600">Free</span> : formatPrice(shipping)}
        />
        <SummaryRow label="Estimated tax" value={formatPrice(tax)} />
        <div className="border-t border-base-200 pt-2.5">
          <SummaryRow label="Total" value={formatPrice(total)} emphasis />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
      <div className="flex flex-col gap-6">
        {/* Mobile: collapsed order summary row with a chevron to expand.
            README "State": `summaryExpanded`. */}
        <div className="border border-base-200 bg-white lg:hidden">
          <button
            type="button"
            onClick={() => setSummaryExpanded((open) => !open)}
            aria-expanded={summaryExpanded}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-DEFAULT hover:bg-base-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900"
          >
            <LineThumb slug={lines[0]?.slug} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-semibold leading-5 text-ink-900">
                {count} item{count === 1 ? "" : "s"}
              </span>
              <span className="truncate text-[12px] leading-4 text-ink-400">
                {lines.map((l) => l.name).join(", ") || "Loading"}
              </span>
            </span>
            <span className="text-[15px] font-semibold leading-5 shrink-0 tabular-nums text-ink-900">
              {formatPrice(total)}
            </span>
            <ChevronDownIcon
              size={18}
              className={cn("shrink-0 text-ink-600", summaryExpanded && "rotate-180")}
            />
          </button>
          {summaryExpanded && (
            <div className="border-t border-base-200 px-4 py-3.5">{summary}</div>
          )}
        </div>

        {/* An offer, not a gate. Shown only to a signed-out shopper who has
            an account system available to them, and it never blocks the form
            below — guest checkout is the default path and stays one scroll
            away. */}
        {authHydrated && !user && (
          <p className="border border-base-200 bg-white px-4 py-3 text-[13px] leading-[18px] text-ink-600">
            <Link
              href="/account/sign-in?next=%2Fcheckout"
              className="font-semibold text-ink-900 underline underline-offset-2 hover:text-accent-600"
            >
              Sign in
            </Link>{" "}
            to use a saved address — or just carry on as a guest.
          </p>
        )}

        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-7">
          <Section title="Contact">
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="sam@example.com"
              {...fieldProps("email")}
            />
          </Section>

          <Section title="Shipping address">
            {/* The saved-address affordance. Renders only when there is
                something to offer, so the guest form is byte-for-byte the
                form it always was. */}
            {saved.length > 0 && (
              <div className="flex flex-col gap-2 border border-base-200 bg-base-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] leading-[18px] text-ink-600">
                    {filledFrom
                      ? "Filled in from your saved address."
                      : "You have saved addresses."}
                  </p>
                  {saved.length > 1 || !filledFrom ? (
                    <button
                      type="button"
                      onClick={() => setPickerOpen((open) => !open)}
                      aria-expanded={pickerOpen}
                      className="text-[13px] font-semibold leading-[18px] text-ink-900 underline underline-offset-2 transition-colors duration-DEFAULT hover:text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                    >
                      {pickerOpen ? "Close" : "Use a different one"}
                    </button>
                  ) : null}
                </div>

                {pickerOpen && (
                  <ul className="flex flex-col gap-2 pt-1">
                    {saved.map((address) => (
                      <li key={address.id}>
                        <button
                          type="button"
                          onClick={() => applyAddress(address)}
                          aria-current={filledFrom === address.id ? "true" : undefined}
                          className={cn(
                            "flex w-full flex-col gap-1 border bg-white p-3 text-left transition-colors duration-DEFAULT",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900",
                            filledFrom === address.id
                              ? "border-ink-900"
                              : "border-base-300 hover:border-ink-900",
                          )}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold leading-5 text-ink-900">
                              {address.full_name}
                            </span>
                            {address.label && (
                              <span className="border border-base-300 px-1.5 py-0.5 text-micro-badge uppercase text-ink-600">
                                {address.label}
                              </span>
                            )}
                          </span>
                          <span className="text-[13px] leading-[18px] text-ink-600">
                            {address.line1}
                            {address.line2 ? `, ${address.line2}` : ""} · {address.city},{" "}
                            {address.state} {address.postal_code}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <TextInput label="Full name" autoComplete="name" {...fieldProps("name")} />
            <TextInput label="Address" autoComplete="address-line1" {...fieldProps("address1")} />
            <TextInput
              label="Apartment, suite (optional)"
              autoComplete="address-line2"
              {...fieldProps("address2")}
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
              <TextInput label="City" autoComplete="address-level2" {...fieldProps("city")} />
              <TextInput
                label="State"
                autoComplete="address-level1"
                maxLength={2}
                placeholder="CA"
                {...fieldProps("state")}
              />
              <TextInput
                label="ZIP"
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="94117"
                {...fieldProps("zip")}
              />
            </div>
          </Section>

          {/* README 05: "Payment is a Stripe element; style it to the input
              token, do not rebuild it." That is now literally what happens —
              see PaymentSection and stripeAppearance. Card data is entered in
              Stripe's iframe and never enters this component's state, which
              is why there are no card fields in `Values` above. */}
          <Section title="Payment">
            <PaymentSection
              ref={paymentRef}
              lines={lines}
              expectedAmount={Math.round(total * 100)}
              error={paymentError}
              onStatusChange={setPaymentStatus}
            />
          </Section>

          {/* Disabled only when payment genuinely cannot happen — no key, or
              the intent failed to create. While it is merely still loading the
              button stays live, so pressing it surfaces any outstanding
              shipping errors instead of silently doing nothing. */}
          <div className="flex flex-col gap-4 border-t border-base-200 pt-5 lg:hidden">
            <Button
              type="submit"
              loading={submitting}
              loadingLabel="Placing order"
              disabled={paymentStatus === "unconfigured" || paymentStatus === "error"}
              fullWidth
            >
              Pay {formatPrice(total)}
            </Button>
          </div>

          <div className="hidden border-t border-base-200 pt-5 lg:block">
            <Button
              type="submit"
              loading={submitting}
              loadingLabel="Placing order"
              disabled={paymentStatus === "unconfigured" || paymentStatus === "error"}
            >
              Pay {formatPrice(total)}
            </Button>
          </div>
        </form>
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <div className="flex flex-col gap-4 border border-base-200 bg-white p-5">
          <h2 className="text-[17px] font-semibold leading-6 text-ink-900">
            {count} item{count === 1 ? "" : "s"}
          </h2>
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li key={line.key} className="flex items-center gap-3">
                <LineThumb slug={line.slug} />
                <span className="min-w-0 flex-1 truncate text-[13px] leading-[19px] text-ink-600">
                  {line.name}
                  {line.qty > 1 ? ` × ${line.qty}` : ""}
                </span>
                <span className="shrink-0 text-[13px] leading-[19px] tabular-nums text-ink-900">
                  {formatPrice(line.unitPrice * line.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-base-200 pt-4">{summary}</div>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      {/* ink-900, not ink-400: the label token is 10px and Accessibility
          bars ink-400 below 13px and from "a form label the user must read
          to proceed" — a section legend is exactly that. */}
      <legend className="mb-3 text-label font-medium uppercase text-ink-900">{title}</legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={cn(
          emphasis ? "text-[15px] font-semibold leading-5 text-ink-900" : "text-[14px] leading-5 text-ink-600",
        )}
      >
        {label}
      </span>
      <span className={cn("tabular-nums", emphasis ? "text-[15px] font-semibold leading-5 text-ink-900" : "text-[14px] leading-5 text-ink-900")}>
        {value}
      </span>
    </div>
  );
}

/** The 34px summary thumbnail. Falls back to a bare well when the slug is
 * absent or not in the catalogue — the mobile summary row renders before
 * the cart has hydrated. */
function LineThumb({ slug }: { slug?: string }) {
  const product = slug ? getProductBySlug(slug) : undefined;
  if (!product) return <ImageWell aspectRatio="1/1" className="w-[34px] shrink-0" />;
  return <ProductPlateThumb product={product} className="w-[34px] shrink-0" />;
}
