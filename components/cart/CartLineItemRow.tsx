"use client";

import Link from "next/link";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getProductBySlug, productHref } from "@/lib/products";
import type { CartLine } from "@/lib/cart/types";

/**
 * One cart line, shared by the mobile drawer and the desktop cart page.
 * README "04 Cart": 76×76 plate on mobile, 88×88 on desktop, then name,
 * variant meta, stepper and price.
 *
 * The PDP link is derived from the catalogue rather than stored on the
 * line. A cart line snapshots price and variant on purpose, but the
 * product route's shelf segment is not a snapshot — it is the catalogue's
 * current address for that slug, and a line persisted before a product
 * moved shelves should follow the product, not link into a 404. A line
 * whose slug has left the catalogue entirely renders unlinked instead.
 */
export function CartLineItemRow({
  line,
  showRemove = false,
  className,
}: {
  line: CartLine;
  showRemove?: boolean;
  className?: string;
}) {
  const { setQuantity, removeItem } = useCart();
  const product = getProductBySlug(line.slug);
  const href = product ? productHref(product) : null;

  const thumb = product ? (
    <ProductPlateThumb product={product} className="w-[76px] lg:w-[88px]" />
  ) : (
    <ImageWell aspectRatio="1/1" className="w-[76px] lg:w-[88px]" />
  );

  return (
    <div className={cn("flex gap-3 sm:gap-4", className)}>
      {href ? (
        <Link
          href={href}
          className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          aria-label={line.name}
        >
          {thumb}
        </Link>
      ) : (
        <div className="shrink-0">{thumb}</div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {href ? (
              <Link
                href={href}
                className="truncate text-title text-ink-900 transition-colors duration-DEFAULT hover:text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                {line.name}
              </Link>
            ) : (
              <p className="truncate text-title text-ink-900">{line.name}</p>
            )}
            <p className="truncate text-body-sm text-ink-400">{line.variant}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-[15px] font-semibold leading-5 tabular-nums text-accent-600">
              {formatPrice(line.unitPrice * line.qty)}
            </span>
            {line.qty > 1 && (
              <span className="text-[12px] leading-4 tabular-nums text-ink-400">
                {formatPrice(line.unitPrice)} each
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            value={line.qty}
            max={line.maxQty}
            onChange={(qty) => setQuantity(line.key, qty)}
            aria-label={`Quantity, ${line.name}`}
          />
          {showRemove && (
            <Button
              variant="ghost-destructive"
              onClick={() => removeItem(line.key)}
              aria-label={`Remove ${line.name}`}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
