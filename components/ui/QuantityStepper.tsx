"use client";

import { cn } from "@/lib/cn";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /**
   * README "Quantity stepper": 32px in the cart drawer, 40–44px on the PDP
   * and cart page. "drawer" takes the 32px box but keeps a 44px hit area
   * through a transparent pseudo-element, so the mobile ≥44px target rule
   * holds without the drawer row growing.
   */
  size?: "drawer" | "default";
  "aria-label"?: string;
  className?: string;
}

/** Minus and plus cells in 600/17 ink-600 flanking a value cell in
 * 600/15 tabular, centred. 1px base-200 border, squared. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "default",
  "aria-label": ariaLabel = "Quantity",
  className,
}: QuantityStepperProps) {
  const isDrawer = size === "drawer";
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  const cellClass = cn(
    "relative inline-flex shrink-0 items-center justify-center rounded-none",
    "text-[17px] font-semibold leading-none text-ink-600",
    "transition-colors duration-DEFAULT hover:bg-base-50",
    "disabled:cursor-not-allowed disabled:text-base-300 disabled:hover:bg-transparent",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
    isDrawer
      ? "h-8 w-8 before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']"
      : "h-11 w-11",
  );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-none border border-base-200",
        isDrawer ? "h-8" : "h-11",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={!canDecrement}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cellClass}
      >
        &minus;
      </button>
      <span
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn(
          "flex h-full shrink-0 items-center justify-center border-x border-base-200",
          "text-[15px] font-semibold leading-5 tabular-nums text-ink-900",
          isDrawer ? "w-8" : "w-10",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={!canIncrement}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cellClass}
      >
        +
      </button>
    </div>
  );
}
