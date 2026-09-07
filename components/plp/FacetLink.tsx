import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * One toggleable facet in the filter rail / filter sheet.
 *
 * These are links, not checkboxes, on purpose: the filter state lives in
 * the URL (README: "Filter/sort: updates the URL query so the state is
 * shareable and back works"), so every facet already *is* a destination.
 * Rendering it as a link means the whole rail works without JavaScript,
 * middle-click opens a filtered listing in a new tab, and the back button
 * walks the filter history for free.
 */
export function FacetLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded py-1.5 text-[14px] leading-5 transition-colors duration-DEFAULT",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
        active ? "font-semibold text-ink-900" : "font-normal text-ink-600 hover:text-ink-900",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors duration-DEFAULT",
          active
            ? "border-ink-900 bg-ink-900 text-base-0"
            : "border-base-300 bg-white text-transparent group-hover:border-ink-900",
        )}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === "number" && (
        <span className="shrink-0 text-[12px] leading-4 tabular-nums text-ink-400">{count}</span>
      )}
    </Link>
  );
}
