import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Flat base-50 blocks at exact final dimensions, per README "Skeleton".
 * Deliberately no shimmer: "it costs paint work against INP for no
 * informational gain."
 */
export function Skeleton({ className, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-none bg-base-50", className)}
      style={style}
      {...rest}
    />
  );
}

export interface SkeletonImageProps {
  /** Plates keep their 3/4 ratio. */
  aspectRatio?: string;
  className?: string;
}

export function SkeletonImage({ aspectRatio = "3/4", className }: SkeletonImageProps) {
  // No hardcoded `w-full` — see ImageWell for why baking in a width utility
  // fights a caller-supplied one under Tailwind's cascade.
  return <Skeleton className={className} style={{ aspectRatio }} />;
}

export interface SkeletonTextProps {
  /** README: text lines are 10px tall at 80% and 45% width. */
  width?: "80%" | "45%" | string;
  className?: string;
}

export function SkeletonText({ width = "80%", className }: SkeletonTextProps) {
  return <Skeleton className={cn("h-[10px]", className)} style={{ width }} />;
}

/** A full plate skeleton at the plate's exact final dimensions: 3/4 well,
 * then the two reserved text lines. */
export function SkeletonPlate({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <SkeletonImage />
      <SkeletonText width="80%" />
      <SkeletonText width="45%" />
    </div>
  );
}
