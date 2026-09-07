"use client";

import Link from "next/link";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getProductBySlug } from "@/lib/products";
import type { CartLine } from "@/lib/cart/types";

/**
 * One cart line, shared by the mobile drawer and the desktop cart page.
 * README "04 Cart": 76×76 plate on mobile, 88×88 on desktop, then name,
 * variant meta, stepper and price.
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

  return (
    <div className={cn("flex gap-3 sm:gap-4", className)}>
      <Link
        href={`/product/${line.slug}`}
        className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        aria-label={line.name}
      >
        {product ? (
          <ProductPlateThumb product={product} className="w-[76px] lg:w-[88px]" />
        ) : (
          <ImageWell aspectRatio="1/1" className="w-[76px] lg:w-[88px]" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={`/product/${line.slug}`}
              className="truncate text-title text-ink-900 transition-colors duration-DEFAULT hover:text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
            >
              {line.name}
            </Link>
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
