import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export interface PriceBlockProps {
  /** Current price. When `soldOut`, this is the price it sold at. */
  price: number;
  /** Compare-at price. Present only on the discounted variant. */
  compareAtPrice?: number | null;
  soldOut?: boolean;
  /**
   * "plate" is the price token (Archivo 13/18, tabular) used under a
   * product plate and in list rows. "lead" is the PDP / cart-line size —
   * the single lead price the README lets carry accent-600.
   */
  size?: "plate" | "lead";
  /** Show the "Save $N" line. On by default whenever discounted. */
  showSave?: boolean;
  className?: string;
}

/**
 * Price block per README "Price block".
 *
 *  - Discounted: accent-600 lead price (tabular) + ink-400 strikethrough
 *    compare-at + "Save $N" in 600 accent-600, 8px gaps, baseline-aligned.
 *  - Full price: ink-900, no compare-at.
 *  - Closed: ink-400 struck-through price.
 *
 * Compare-at always follows the current price, never precedes it, and the
 * strikethrough carries a visually-hidden "was" prefix for screen readers.
 */
export function PriceBlock({
  price,
  compareAtPrice,
  soldOut = false,
  size = "plate",
  showSave = true,
  className,
}: PriceBlockProps) {
  const isLead = size === "lead";
  const priceSizeClass = isLead
    ? "text-[22px] leading-7 font-semibold"
    : "text-[13px] leading-[18px] font-normal";
  const metaSizeClass = isLead ? "text-[15px] leading-5" : "text-[13px] leading-[18px]";

  const isDiscounted = !soldOut && typeof compareAtPrice === "number" && compareAtPrice > price;
  const save = isDiscounted ? compareAtPrice - price : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "tabular-nums",
          priceSizeClass,
          soldOut
            ? "text-ink-400 line-through"
            : isDiscounted
              ? "text-accent-600"
              : "text-ink-900",
        )}
      >
        {formatPrice(price)}
      </span>

      {isDiscounted && (
        <span className={cn(metaSizeClass, "font-normal tabular-nums text-ink-400 line-through")}>
          <span className="sr-only-cd">was </span>
          {formatPrice(compareAtPrice)}
        </span>
      )}

      {isDiscounted && showSave && (
        <span className={cn(metaSizeClass, "font-semibold tabular-nums text-accent-600")}>
          Save {formatPrice(save)}
        </span>
      )}
    </div>
  );
}
