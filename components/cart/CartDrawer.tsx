"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CloseIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { CartLineItemRow } from "./CartLineItemRow";
import { OrderSummary } from "./OrderSummary";

/**
 * The mobile cart. README "04 Cart — Mobile": a drawer; the page behind
 * dims to ink-900 and the sheet rises with a 20px top radius over a 76px
 * exposed strip.
 *
 * `lg:hidden` on purpose — at lg the cart is the two-column /cart page and
 * the header's cart control is a link rather than a button, so this never
 * competes with it.
 *
 * Nothing slides. README "Interactions": transitions are colour,
 * border-colour and background only, at 120ms — so the sheet appears, it
 * does not animate in.
 */
export function CartDrawer() {
  const { lines, drawerOpen, closeDrawer, subtotal, shipping, tax, total, count, error } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Navigating away closes the sheet — otherwise tapping a line item lands
  // you on the PDP with the drawer still over it.
  useEffect(() => {
    closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className="relative flex max-h-[calc(100dvh-76px)] flex-col bg-base-0 shadow-hairline"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-base-200 px-4 py-3">
          <h2 className="font-display text-h2 text-ink-900">
            Cart{" "}
            <span className="font-normal tabular-nums text-ink-400">
              ({count})
            </span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="inline-flex h-11 w-11 items-center justify-center text-ink-900 transition-colors duration-DEFAULT hover:bg-base-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-4 py-8">
            <p className="text-[17px] font-semibold leading-6 text-ink-900">Nothing in here yet.</p>
            <p className="text-body text-ink-600">
              Six shelves, twelve things. Go find one.
            </p>
            <Button variant="secondary" onClick={closeDrawer} className="mt-1">
              Keep browsing
            </Button>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              {error && (
                <p role="alert" className="border border-accent-600 bg-accent-50 px-3 py-2 text-[13px] leading-[19px] text-accent-600">
                  {error}
                </p>
              )}
              {lines.map((line) => (
                <CartLineItemRow key={line.key} line={line} showRemove />
              ))}
            </div>

            <div className="shrink-0 border-t border-base-200 px-4 pb-6 pt-4">
              <OrderSummary
                totals={{ subtotal, shipping, tax, total, count }}
                footnote="30 days to change your mind."
              >
                <div className="mt-2 flex flex-col gap-2">
                  <ButtonLink href="/checkout" fullWidth onClick={closeDrawer}>
                    Checkout · {formatPrice(total)}
                  </ButtonLink>
                  <Button variant="secondary" fullWidth onClick={closeDrawer}>
                    Keep browsing
                  </Button>
                </div>
              </OrderSummary>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
