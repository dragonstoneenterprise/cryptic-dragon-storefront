"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SORT_OPTIONS, filtersToHref, type Filters, type SortId } from "@/lib/filters";
import { cn } from "@/lib/cn";

/**
 * Sort is a native `<select>` dressed to the tertiary-button token rather
 * than a hand-built popover: it gets keyboard support, mobile's native
 * wheel picker and screen-reader semantics for free, and the design's
 * control is a plain "Sort · <value> ⌄" row that a select renders exactly.
 *
 * Changing it pushes a URL rather than mutating local state, so sort lands
 * in history alongside the filters and a sorted listing is shareable.
 */
export function SortControl({
  pathname,
  filters,
  className,
}: {
  pathname: string;
  filters: Filters;
  className?: string;
}) {
  const router = useRouter();
  const current = SORT_OPTIONS.find((o) => o.id === filters.sort) ?? SORT_OPTIONS[0];

  return (
    <div
      className={cn(
        "relative inline-flex h-9 items-center gap-1.5 border border-base-200 pl-3 pr-2",
        "transition-colors duration-DEFAULT hover:border-base-300 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-900",
        className,
      )}
    >
      {/* Below sm the control collapses to just "Sort", matching the
          mobile mockup's `Filter | Sort` pair — spelling out the current
          value there squeezes the result count into an ellipsis. */}
      <span className="text-[13px] font-semibold leading-[18px] text-ink-900 sm:hidden">Sort</span>
      <span className="hidden text-label uppercase text-ink-400 sm:inline" aria-hidden="true">
        Sort
      </span>
      <span className="hidden text-[13px] font-semibold leading-[18px] text-ink-900 sm:inline">
        {current.label}
      </span>
      <ChevronDownIcon size={15} className="text-ink-600" />
      <label className="sr-only-cd" htmlFor="plp-sort">
        Sort products
      </label>
      <select
        id="plp-sort"
        value={filters.sort}
        onChange={(event) =>
          router.push(
            filtersToHref(pathname, {
              ...filters,
              sort: event.target.value as SortId,
              page: 1,
            }),
            { scroll: false },
          )
        }
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
