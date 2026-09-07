import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CartTotals } from "@/lib/cart/types";

function Row({
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
          emphasis
            ? "text-[15px] font-semibold leading-5 text-ink-900"
            : "text-[14px] leading-5 text-ink-600",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          emphasis ? "text-[15px] font-semibold leading-5 text-ink-900" : "text-[14px] leading-5 text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Subtotal / shipping / tax / total, per README "04 Cart".
 *
 * Shipping reads "Free" in success-600, not accent-600: the README scopes
 * success-600 to "open run" / paid status text, and reserves accent-600
 * for the plate numeral, the saving amount and the single lead price. A
 * second accent-coloured number in the same column would compete with the
 * one that matters.
 */
export function OrderSummary({
  totals,
  title,
  children,
  footnote,
  className,
}: {
  totals: CartTotals;
  title?: string;
  children?: ReactNode;
  footnote?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {title && <h2 className="text-[17px] font-semibold leading-6 text-ink-900">{title}</h2>}

      <div className="flex flex-col gap-2.5">
        <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
        <Row
          label="Shipping"
          value={
            totals.shipping === 0 ? (
              <span className="font-semibold text-success-600">Free</span>
            ) : (
              formatPrice(totals.shipping)
            )
          }
        />
        <Row label="Estimated tax" value={formatPrice(totals.tax)} />
        <div className="border-t border-base-200 pt-2.5">
          <Row label="Total" value={formatPrice(totals.total)} emphasis />
        </div>
      </div>

      {children}

      {footnote && <p className="text-[12px] leading-[17px] text-ink-400">{footnote}</p>}
    </div>
  );
}
