import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filtersToHref,
  toggleInList,
  type Filters,
  type ListingResult,
  type StatusId,
} from "@/lib/filters";
import { FacetLink } from "./FacetLink";

/**
 * The desktop sub-filter rail from README "02 Category listing".
 *
 * Three groups — Subcategory, Price, Status — which is what the PLP-desktop
 * mock in `Cryptic Dragon.dc.html` actually draws. The README's prose for
 * this screen names a different set ("Dogs / Cats / Dogs & cats /
 * Autoship") that no field in `products.json` can answer; see the long note
 * at the top of `lib/filters.ts` for why the drawn rail wins and why
 * nothing here is invented.
 *
 * Rendered as a Server Component: every control is a link built from the
 * current filter state, so no client bundle is needed for the rail. The
 * same markup is reused inside the mobile filter sheet.
 */
export function FilterGroups({
  pathname,
  filters,
  facets,
}: {
  pathname: string;
  filters: Filters;
  facets: ListingResult["facets"];
}) {
  // Any facet change resets to page 1 — otherwise you can land on an empty
  // page 3 of a two-page result.
  const href = (patch: Partial<Filters>) =>
    filtersToHref(pathname, { ...filters, ...patch, page: 1 });

  return (
    <div className="flex flex-col gap-5">
      <Group title="Subcategory">
        <FacetLink
          href={href({ shelf: [] })}
          label="All shelves"
          count={facets.shelf.reduce((n, s) => n + s.count, 0)}
          active={filters.shelf.length === 0}
        />
        {facets.shelf.map((option) => (
          <FacetLink
            key={option.id}
            href={href({ shelf: toggleInList(filters.shelf, option.id) })}
            label={option.label}
            count={option.count}
            active={filters.shelf.includes(option.id)}
          />
        ))}
      </Group>

      <Group title="Price" divided>
        {facets.price.map((option) => (
          <FacetLink
            key={option.id}
            href={href({ price: toggleInList(filters.price, option.id) })}
            label={option.label}
            count={option.count}
            active={filters.price.includes(option.id)}
          />
        ))}
      </Group>

      <Group title="Status" divided>
        {facets.status.map((option) => (
          <FacetLink
            key={option.id}
            href={href({ status: toggleInList(filters.status, option.id as StatusId) })}
            label={option.label}
            count={option.count}
            active={filters.status.includes(option.id as StatusId)}
          />
        ))}
        {/* Not a selection like the two above it — the word "only" promises
            an exclusion, so it toggles its own flag rather than widening
            the OR. */}
        <FacetLink
          href={href({ inStockOnly: !filters.inStockOnly })}
          label="Open runs only"
          count={facets.inStock}
          active={filters.inStockOnly}
        />
      </Group>

      {activeFilterCount(filters) > 0 && (
        <Link
          href={filtersToHref(pathname, { ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}
          scroll={false}
          className="self-start text-body-sm font-semibold text-accent-600 transition-colors duration-DEFAULT hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
        >
          Clear all filters
        </Link>
      )}
    </div>
  );
}

/** The mock separates rail groups with a base-200 hairline and 20px of
 * padding — the system's one elevation device. The first group has nothing
 * above it to divide from. */
function Group({
  title,
  divided = false,
  children,
}: {
  title: string;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-1", divided && "border-t border-base-200 pt-5")}>
      <h3 className="mb-1 text-label font-medium uppercase text-ink-400">{title}</h3>
      {children}
    </section>
  );
}
