"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { getProductBySlug } from "@/lib/products";
import { TextInput } from "@/components/ui/TextInput";
import { ChevronDownIcon, LockIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { arrivalWindow } from "@/lib/dates";
import { orderNumber, saveOrder } from "@/lib/order";
import { cn } from "@/lib/cn";

/**
 * 05 Checkout. One page, no wizard (README is explicit about that).
 *
 * Validation runs **on blur, not on keystroke** — README "Interactions:
 * Form validation: on blur, not on keystroke." Submit re-validates
 * everything and focuses the first invalid field. A field that has never
 * been blurred shows no error, so typing into an empty form is silent.
 *
 * Payment is a styled placeholder. The README says to style Stripe's
 * element to the input token rather than rebuild it; there is no Stripe
 * key in this build, so what ships is the token-styled container Stripe
 * would mount into, labelled honestly rather than wearing a "Secured by
 * Stripe" badge it hasn't earned.
 */

type FieldId =
  | "email"
  | "name"
  | "address1"
  | "address2"
  | "city"
  | "state"
  | "zip"
  | "cardNumber"
  | "cardExpiry"
  | "cardCvc";

type Values = Record<FieldId, string>;

const INITIAL: Values = {
  email: "",
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
};

/** Order matters: submit focuses the first invalid field in this order. */
const FIELD_ORDER: FieldId[] = [
  "email",
  "name",
  "address1",
  "city",
  "state",
  "zip",
  "cardNumber",
  "cardExpiry",
  "cardCvc",
];

function validate(id: FieldId, value: string): string | undefined {
  const v = value.trim();
  switch (id) {
    case "email":
      if (!v) return "Add an email so we can send the receipt.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That doesn't look like an email address.";
      return undefined;
    case "name":
      if (!v) return "Who is this going to?";
      return undefined;
    case "address1":
      if (!v) return "We need a street address.";
      return undefined;
    case "city":
      if (!v) return "Add a city.";
      return undefined;
    case "state":
      if (!v) return "Add a state.";
      if (!/^[A-Za-z]{2}$/.test(v)) return "Use the two-letter state code.";
      return undefined;
    case "zip":
      if (!v) return "Add a ZIP code.";
      if (!/^\d{5}(-\d{4})?$/.test(v)) return "US ZIP codes are five digits.";
      return undefined;
    case "cardNumber": {
      const digits = v.replace(/\s/g, "");
      if (!digits) return "Add a card number.";
      if (!/^\d{13,19}$/.test(digits)) return "A card number is 13 to 19 digits.";
      return undefined;
    }
    case "cardExpiry":
      if (!v) return "Add the expiry date.";
      if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v)) return "Use MM / YY.";
      return undefined;
    case "cardCvc":
      if (!v) return "Add the security code.";
      if (!/^\d{3,4}$/.test(v)) return "Three or four digits.";
      return undefined;
    default:
      return undefined;
  }
}

export function CheckoutView() {
  const router = useRouter();
  const { lines, hydrated, subtotal, shipping, tax, total, count, clearCart } = useCart();

  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldId, boolean>>>({});
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setValue(id: FieldId, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    setSubmitting(true);
    saveOrder({
      number: orderNumber(),
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

  if (hydrated && lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
        <h2 className="text-h2 text-ink-900">There&apos;s nothing to pay for.</h2>
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

        {/* TODO(phase-2): the previous spec's wallet buttons (Apple Pay /
            Google Pay) are gone. The Cryptic Dragon spec says only
            "Payment is a Stripe element; style it to the input token, do
            not rebuild it" — wire the real element in Phase 2. */}

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

          <Section title="Payment">
            <div className="border border-base-200 bg-white p-4">
              <div className="flex flex-col gap-4">
                <TextInput
                  label="Card number"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  {...fieldProps("cardNumber")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Expiry"
                    autoComplete="cc-exp"
                    placeholder="04 / 27"
                    {...fieldProps("cardExpiry")}
                  />
                  <TextInput
                    label="Security code"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    placeholder="CVC"
                    {...fieldProps("cardCvc")}
                  />
                </div>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[12px] leading-4 text-ink-400">
              <LockIcon size={13} className="text-ink-400" />
              Placeholder for the Stripe element — nothing entered here is sent anywhere.
            </p>
          </Section>

          <div className="flex flex-col gap-4 border-t border-base-200 pt-5 lg:hidden">
            <Button type="submit" loading={submitting} loadingLabel="Placing order" fullWidth>
              Pay {formatPrice(total)}
            </Button>
          </div>

          <div className="hidden border-t border-base-200 pt-5 lg:block">
            <Button type="submit" loading={submitting} loadingLabel="Placing order">
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
      <legend className="mb-3 text-label uppercase text-ink-400">{title}</legend>
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
