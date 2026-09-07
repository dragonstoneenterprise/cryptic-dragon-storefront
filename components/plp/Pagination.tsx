import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { filtersToHref, type Filters } from "@/lib/filters";
import { cn } from "@/lib/cn";

const stepClass =
  "inline-flex h-10 items-center gap-1.5 border border-base-200 px-3 text-[14px] font-medium leading-5 " +
  "transition-colors duration-DEFAULT focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900";

/** `page` is part of the URL-mirrored filter state (README "State"), so
 * paging is links rather than client state, and back walks pages. */
export function Pagination({
  pathname,
  filters,
  page,
  pageCount,
}: {
  pathname: string;
  filters: Filters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const prevHref = filtersToHref(pathname, { ...filters, page: page - 1 });
  const nextHref = filtersToHref(pathname, { ...filters, page: page + 1 });

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-base-200 pt-5">
      {page > 1 ? (
        <Link href={prevHref} scroll={false} className={cn(stepClass, "text-ink-900 hover:border-base-300")}>
          <ChevronLeftIcon size={16} />
          Previous
        </Link>
      ) : (
        <span className={cn(stepClass, "cursor-not-allowed text-base-300")} aria-disabled="true">
          <ChevronLeftIcon size={16} />
          Previous
        </span>
      )}

      <p className="text-[13px] leading-[19px] tabular-nums text-ink-400">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link href={nextHref} scroll={false} className={cn(stepClass, "text-ink-900 hover:border-base-300")}>
          Next
          <ChevronRightIcon size={16} />
        </Link>
      ) : (
        <span className={cn(stepClass, "cursor-not-allowed text-base-300")} aria-disabled="true">
          Next
          <ChevronRightIcon size={16} />
        </span>
      )}
    </nav>
  );
}
