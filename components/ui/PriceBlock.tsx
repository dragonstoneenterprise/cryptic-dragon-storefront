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
  /**
   * Show the "Save $N" line. Defaults to lead-size only: a plate already
   * states its discount in the badge ("21% off"), and the PLP mock's grid
   * card carries price + compare-at and nothing else, so repeating the
   * saving under every discounted plate is the same fact three times.
   */
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
 *
 * On which prices get accent-600
 * ------------------------------
 * The colour usage rule scopes it tightly: accent-600 carries "the plate
 * numeral, the saving amount, **the single lead price on a PDP or cart
 * line**" — not every discounted price everywhere. A discounted price in a
 * product grid is not a lead price, and the PLP-desktop mock confirms it,
 * drawing the discounted grid figure in ink-900 (#18140F) with only the
 * compare-at greyed.
 *
 * So the accent is gated on `size === "lead"`, not on `isDiscounted`. The
 * "Save $N" line keeps its accent at both sizes — the rule names the saving
 * amount separately from the lead price — but it is only ever rendered
 * alongside a lead price in practice, since plates carry the saving in
 * their badge instead.
 */
export function PriceBlock({
  price,
  compareAtPrice,
  soldOut = false,
  size = "plate",
  showSave,
  className,
}: PriceBlockProps) {
  const isLead = size === "lead";
  const withSave = showSave ?? isLead;
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
            : isDiscounted && isLead
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

      {isDiscounted && withSave && (
        <span className={cn(metaSizeClass, "font-semibold tabular-nums text-accent-600")}>
          Save {formatPrice(save)}
        </span>
      )}
    </div>
  );
}
