import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ImageWellProps {
  /**
   * Defaults to the plate's `3/4`. Every plate declares its ratio so the
   * grid does not shift when photography loads — that is what holds CLS
   * under 0.1. Small thumbnails (cart line, checkout summary) pass "1/1".
   */
  aspectRatio?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * The well behind product photography: a base-100 field, squared, at a
 * declared aspect ratio. README "Product plate" — "a `3/4` aspect-ratio
 * well filled base-100, squared".
 *
 * Radius is not a prop. It is 0, always, everywhere.
 */
export function ImageWell({ aspectRatio = "3/4", className, children }: ImageWellProps) {
  return (
    // No hardcoded width utility here on purpose: Tailwind resolves
    // conflicting utilities (e.g. a caller's `w-32`) by generated-CSS order,
    // not by position in the class string, so baking in `w-full` would
    // unpredictably fight a caller-supplied width. A bare block <div>
    // already fills its container in normal flow or a grid/flex parent's
    // stretch axis, and callers needing an explicit size pass it in.
    <div
      className={cn("relative overflow-hidden rounded-none bg-base-100", className)}
      style={{ aspectRatio }}
    >
      {children}
    </div>
  );
}
