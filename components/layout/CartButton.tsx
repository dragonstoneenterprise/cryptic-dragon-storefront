"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { CartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

function CountBadge({ count, hydrated }: { count: number; hydrated: boolean }) {
  // Nothing renders until localStorage has been read, so the server HTML
  // and the first client render agree and there is no hydration flash.
  if (!hydrated || count === 0) return null;
  return (
    <span
      className="absolute -right-1.5 -top-1 inline-flex h-4 min-w-4 items-center justify-center bg-ink-900 px-1 text-[10px] font-medium leading-4 tabular-nums text-base-0"
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// No `display` utility in here on purpose: each of the two elements below
// needs a *different* breakpoint-gated display, and clsx concatenates
// rather than merges — `"inline-flex" + "hidden"` would be resolved by
// generated-CSS order, not string order, and both icons would render.
const targetClass =
  "relative h-10 w-10 items-center justify-center text-ink-900 " +
  "transition-colors duration-DEFAULT hover:bg-base-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900";

/**
 * Two elements rather than one, split by breakpoint:
 *
 *  - below lg the cart is a drawer (README 04 Cart), so this is a button
 *    that opens it;
 *  - at lg and above the cart is a two-column page, so this is a link to
 *    /cart.
 *
 * Rendering both and letting CSS pick avoids reading a media query at
 * click time, which would either be wrong on the first click or require a
 * hydration-unsafe render.
 */
export function CartButton({ className }: { className?: string }) {
  const { count, hydrated, openDrawer } = useCart();
  const label = hydrated && count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart";

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-label={label}
        aria-haspopup="dialog"
        className={cn(targetClass, "inline-flex lg:hidden", className)}
      >
        <span className="relative inline-flex">
          <CartIcon size={19} />
          <CountBadge count={count} hydrated={hydrated} />
        </span>
      </button>

      <Link
        href="/cart"
        aria-label={label}
        className={cn(targetClass, "hidden lg:inline-flex", className)}
      >
        <span className="relative inline-flex">
          <CartIcon size={19} />
          <CountBadge count={count} hydrated={hydrated} />
        </span>
      </Link>
    </>
  );
}
