"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

/**
 * README "Cart add": "drawer opens on mobile / toast on desktop". The
 * drawer handles below-lg; this is the lg-and-up half.
 *
 * Bordered hairline, no shadow beyond the system's one hairline, and no
 * entrance animation — the interaction budget only allows colour,
 * border-colour and background at 120ms.
 */
export function AddedToast() {
  const { toast, dismissToast, count } = useCart();
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-40 hidden w-[340px] items-start gap-3 border border-base-200 bg-white px-4 py-3.5 shadow-hairline lg:flex"
    >
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center bg-success-50 text-success-600">
        <CheckIcon size={13} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[14px] font-semibold leading-5 text-ink-900">
          {toast.name} added
        </p>
        <p className="text-[13px] leading-[19px] text-ink-400">
          {count} item{count === 1 ? "" : "s"} in your cart.
        </p>
        <Link
          href="/cart"
          onClick={dismissToast}
          className="mt-0.5 self-start text-[13px] font-semibold leading-[18px] text-accent-600 transition-colors duration-DEFAULT hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          View cart
        </Link>
      </div>
      <button
        type="button"
        onClick={dismissToast}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-ink-400 transition-colors duration-DEFAULT hover:bg-base-50 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
