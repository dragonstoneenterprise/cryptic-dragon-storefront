import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The gutter system from README "Breakpoints":
 *   base 16px · sm 24px · lg/xl 40px page padding with a max-w-1200
 *   centred content column.
 *
 * The outer cap is 1280 rather than 1200 so that at a 1280 viewport the
 * 40px page padding yields exactly the 1200 content width the desktop
 * mockups are drawn at, and content stops growing beyond that.
 */
export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}
