"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { HeartIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isSoldOut, sizeOptions, type Product } from "@/lib/products";
import {
  getServerWishlistSnapshot,
  getWishlistSnapshot,
  subscribeToWishlist,
  toggleWishlist,
} from "@/lib/wishlist";

/**
 * Everything on the PDP that reacts to a choice: the price, the size
 * selector, the quantity and the add-to-cart control. One client component
 * rather than four, because the selected size is read by the selector and
 * the cart write both.
 *
 * Add-to-cart is inline here and repeated in the mobile sticky bar
 * (README: sticky on mobile, inline on desktop) — the sticky bar is
 * rendered by this component too, so both share one `adding` state and one
 * size selection.
 *
 * Variant axes are implied by the spec bullets rather than enumerated per
 * SKU, and "a one-size product hides the size selector rather than showing
 * a single disabled cell" — hence the empty-array check rather than a
 * disabled "One size" cell.
 *
 * The eyebrow is the README's "Rest · Open run" — shelf name, then run
 * status. Status takes the token the colour table assigns it: success-600
 * for an open run, warn-600 for the low-stock count, ink-400 for a closed
 * one. It is set in ink-600 rather than ink-400 because the label token is
 * 10px and Accessibility restricts ink-400 to "13px+ secondary meta".
 *
 * Not shipped: the autoship checkbox. `products.json` carries no autoship
 * field and no subscription terms — cadence, cancellation, who is charged
 * when — so a checkbox offering a recurring charge would be inventing a
 * commercial commitment the handoff never made. `autoshipPrice()` is in
 * lib/products against the day that data exists.
 */
export function PdpBuyPanel({ product, deliveryBy }: { product: Product; deliveryBy: string }) {
  const { addItem } = useCart();
  const sizes = sizeOptions(product);
  const [size, setSize] = useState(sizes[0] ?? "One size");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const soldOut = isSoldOut(product);
  // Stock is a boolean in the catalogue with an optional "only N left"
  // count; the stepper cap follows the count when there is one.
  const maxQty = soldOut ? 0 : (product.stockRemaining ?? 10);

  const wishlist = useSyncExternalStore(
    subscribeToWishlist,
    getWishlistSnapshot,
    getServerWishlistSnapshot,
  );
  const saved = wishlist.includes(product.slug);

  // README colour table: success-600 "open run" status, warn-600 low-stock
  // text, ink-400 for the closed run.
  const runStatus = soldOut
    ? { label: "Closed", className: "text-ink-400" }
    : product.stockRemaining !== null
      ? { label: `Only ${product.stockRemaining} left`, className: "text-warn-600" }
      : { label: "Open run", className: "text-success-600" };

  async function onAdd() {
    if (soldOut || adding) return;
    setAdding(true);
    try {
      await addItem({
        productId: product.slug,
        slug: product.slug,
        name: product.name,
        variant: size,
        variantId: sizes.length ? size.toLowerCase().replace(/\s+/g, "-") : "one-size",
        unitPrice: product.price,
        compareAtPrice: product.compareAtPrice,
        maxQty,
        qty,
      });
    } finally {
      setAdding(false);
    }
  }

  const addButton = (
    <Button
      onClick={onAdd}
      loading={adding}
      loadingLabel="Adding"
      soldOut={soldOut}
      soldOutLabel="Closed"
      fullWidth
    >
      Add to cart
    </Button>
  );

  /**
   * The wishlist control. Tertiary token (1px base-200 border, ink-600,
   * hover to base-300 / ink-900), squared, 44px so it clears the mobile
   * target minimum and lines up with the desktop stepper.
   *
   * `aria-pressed` rather than a link, because it toggles a state rather
   * than going anywhere, and the accessible name says what it does without
   * implying an account: this remembers the product in this browser.
   */
  const wishlistButton = (
    <button
      type="button"
      onClick={() => toggleWishlist(product.slug)}
      aria-pressed={saved}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-none border px-3",
        "text-body-sm transition-colors duration-DEFAULT lg:w-11 lg:px-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
        saved
          ? "border-base-300 text-accent-600"
          : "border-base-200 text-ink-600 hover:border-base-300 hover:text-ink-900",
      )}
    >
      <HeartIcon size={18} />
      {/* Desktop collapses to the icon alone beside the stepper and the
          add button; the label stays in the accessibility tree. */}
      <span className="lg:sr-only">{saved ? "Saved to this browser" : "Save for later"}</span>
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {/* README 03: the "Rest · Open run" eyebrow. */}
          <p className="text-label font-medium uppercase text-ink-600">
            {product.shelfName} ·{" "}
            <span className={runStatus.className}>{runStatus.label}</span>
          </p>
          <h1 className="text-[22px] font-bold leading-7 text-ink-900 lg:text-[26px] lg:leading-8">
            {product.name}
          </h1>
          <PriceBlock
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            soldOut={soldOut}
            size="lead"
          />
          <p className="text-body-sm text-ink-600">
            {soldOut ? "This run is closed." : `Delivery by ${deliveryBy}`}
          </p>
        </div>

        <ul className="flex flex-col gap-1 border-t border-base-200 pt-4">
          {product.specs.map((spec) => (
            <li key={spec} className="text-body-sm text-ink-600">
              {spec}
            </li>
          ))}
        </ul>

        {sizes.length > 0 && (
          <fieldset className="border-t border-base-200 pt-4">
            <legend className="sr-only-cd">Size</legend>
            <p className="mb-2 text-label font-medium uppercase text-ink-600" aria-hidden="true">
              Size — {size}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((option) => {
                const selected = option === size;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSize(option)}
                    aria-pressed={selected}
                    className={cn(
                      "h-11 min-w-11 rounded-none border px-3 text-body-sm transition-colors duration-DEFAULT",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
                      selected
                        ? "border-ink-900 bg-ink-900 font-medium text-base-0"
                        : "border-base-300 bg-transparent text-ink-600 hover:border-ink-900",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Mobile keeps the same control, labelled, in the panel — the
            sticky bar below is price + primary button only, and a heart in
            the header bar would have to be a link to a wishlist screen
            this build does not have. */}
        <div className="flex border-t border-base-200 pt-4 lg:hidden">{wishlistButton}</div>

        {/* Desktop: add-to-cart is inline with the stepper and the
            wishlist button, not sticky (README 03 desktop). */}
        <div className="hidden items-center gap-3 border-t border-base-200 pt-4 lg:flex">
          <QuantityStepper
            value={qty}
            max={Math.max(1, maxQty)}
            disabled={soldOut}
            onChange={setQty}
            aria-label="Quantity"
          />
          <div className="min-w-0 flex-1">{addButton}</div>
          {wishlistButton}
        </div>
      </div>

      {/* Mobile: sticky add-to-cart bar, base-0 fill with the system's one
          hairline shadow. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-base-200 bg-base-0 px-4 pb-6 pt-3 shadow-hairline lg:hidden">
        <div className="flex flex-col">
          <span
            className={cn(
              "text-[15px] font-semibold leading-5 tabular-nums",
              product.compareAtPrice ? "text-accent-600" : "text-ink-900",
            )}
          >
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[12px] leading-4 tabular-nums text-ink-400 line-through">
              <span className="sr-only-cd">was </span>
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        <div className="flex-1">{addButton}</div>
      </div>
    </>
  );
}
