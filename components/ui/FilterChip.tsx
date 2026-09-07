import { forwardRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Filter chip per README "Filter chip". 32px tall, 16px horizontal
 * padding, squared, 10px/.16em uppercase.
 *
 *  - selected: ink-900 fill, base-0 text, weight 500
 *  - default:  transparent, 1px base-300 border, ink-600 text;
 *              hover border-color ink-900
 *
 * NOTE on the 44px target rule: the README sets chips at 32px while also
 * requiring "all interactive targets ≥44×44px on mobile". The chip keeps
 * its specified 32px painted box and reaches 44px through a transparent
 * vertical `before` pseudo-element, so the hit area is compliant without
 * the row growing 12px taller than the design.
 */
export function filterChipClass({
  selected = false,
  disabled = false,
  className,
}: {
  selected?: boolean;
  disabled?: boolean;
  className?: string;
} = {}) {
  return cn(
    "relative inline-flex h-8 shrink-0 items-center rounded-none px-4",
    "text-micro-badge uppercase transition-colors duration-DEFAULT",
    "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
    disabled
      ? "cursor-not-allowed border border-base-200 bg-transparent text-base-300"
      : selected
        ? "border border-ink-900 bg-ink-900 font-medium text-base-0"
        : "border border-base-300 bg-transparent font-medium text-ink-600 hover:border-ink-900",
    className,
  );
}

export interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { selected = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={filterChipClass({ selected, disabled: !!disabled, className })}
      {...rest}
    >
      {children}
    </button>
  );
});

/**
 * Horizontal-scroll container for a row of shelf / filter chips. Bleeds
 * into the 16px mobile gutter and hides its scrollbar, per README.
 */
export function FilterChipRow({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "scrollbar-hidden -mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 sm:-mx-6 sm:px-6",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
