import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeVariant } from "@/lib/products";

/**
 * Plate badge per README "Badge".
 *
 * 22px tall, 8px horizontal padding, squared, micro-badge type. One badge
 * per plate, resolved by priority (sold out → % off → only N left → new) —
 * `pickBadge` in lib/products owns that resolution; this component only
 * draws the winner.
 *
 * Badges always carry a text label, never colour alone, and the sale badge
 * inverts to base-0 on ink-900 rather than onto accent: accent-600 is
 * "never a large fill".
 */
const variantClasses: Record<BadgeVariant, string> = {
  /** "N% off" / "Save $N" */
  sale: "bg-ink-900 text-base-0",
  new: "bg-base-0 text-ink-900",
  "low-stock": "bg-base-0 text-ink-900",
  /** "Closed" is the house term for sold out. */
  "sold-out": "bg-transparent text-ink-400 border border-base-300",
};

export interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center px-2 text-micro-badge font-medium uppercase",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
