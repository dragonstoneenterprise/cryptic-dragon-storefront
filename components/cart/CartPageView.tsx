"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SkeletonImage, SkeletonText } from "@/components/ui/Skeleton";
import { useCart } from "@/lib/cart/CartProvider";
import { CartLineItemRow } from "./CartLineItemRow";
import { OrderSummary } from "./OrderSummary";

/**
 * 04 Cart, page form. README desktop: two columns, `1fr 380px` with a 40px
 * gap — line items left, sticky summary card right.
 *
 * The drawer is the primary mobile surface (the header's cart control
 * opens it below lg), but this route stays fully usable at every width:
 * it is a real URL people bookmark, share and land on from a toast, and a
 * mobile visitor arriving here should get a cart, not a redirect.
 */
export function CartPageView() {
  const { lines, hydrated, subtotal, shipping, tax, total, count, error } = useCart();

  if (!hydrated) {
    // Flat skeleton at the final dimensions — no shimmer, per the spec.
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4">
            <SkeletonImage aspectRatio="1/1" className="w-[76px] shrink-0" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <SkeletonText width="60%" />
              <SkeletonText width="35%" />
              <SkeletonText width="45%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
        <h2 className="font-display text-h2 text-ink-900">Nothing in here yet.</h2>
        <p className="max-w-[46ch] text-body text-ink-600">
          Twelve things, chosen once and kept in stock. Go find one.
        </p>
        <ButtonLink href="/category/all" className="mt-1">
          Start browsing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-5">
        {error && (
          <p
            role="alert"
            className="border border-accent-600 bg-accent-50 px-3 py-2 text-[13px] leading-[19px] text-accent-600"
          >
            {error}
          </p>
        )}

        <ul className="flex flex-col">
          {lines.map((line) => (
            <li key={line.key} className="border-b border-base-200 py-5 first:pt-0 last:border-b-0">
              <CartLineItemRow line={line} showRemove />
            </li>
          ))}
        </ul>

        <Link
          href="/category/all"
          className="self-start text-[14px] font-semibold leading-5 text-accent-600 transition-colors duration-DEFAULT hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          Keep browsing
        </Link>
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="border border-base-200 bg-white p-5">
          <OrderSummary
            totals={{ subtotal, shipping, tax, total, count }}
            title="Order summary"
            footnote="30 days to change your mind."
          >
            <ButtonLink href="/checkout" fullWidth className="mt-2">
              Checkout
            </ButtonLink>
          </OrderSummary>
        </div>
      </aside>
    </div>
  );
}
