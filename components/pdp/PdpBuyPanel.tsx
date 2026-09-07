"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isSoldOut, sizeOptions, type Product } from "@/lib/products";

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
 * TODO(phase-2): the mockup's buy panel also carries the "Rest · Open run"
 * eyebrow, a delivery estimate, the autoship checkbox with its discounted
 * monthly price and a wishlist button. Those are screen composition, not
 * primitives, so they belong to the Phase 2 screen build.
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

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-label font-medium uppercase text-ink-400">
            {product.shelfNumeral} · {product.shelfName} ·{" "}
            <span className={soldOut ? "text-ink-400" : "text-success-600"}>
              {soldOut ? "Closed" : "Open run"}
            </span>
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
            <p className="mb-2 text-label font-medium uppercase text-ink-400" aria-hidden="true">
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

        {/* Desktop: add-to-cart is inline, not sticky. */}
        <div className="hidden items-center gap-3 border-t border-base-200 pt-4 lg:flex">
          <QuantityStepper
            value={qty}
            max={Math.max(1, maxQty)}
            disabled={soldOut}
            onChange={setQty}
            aria-label="Quantity"
          />
          <div className="flex-1">{addButton}</div>
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
