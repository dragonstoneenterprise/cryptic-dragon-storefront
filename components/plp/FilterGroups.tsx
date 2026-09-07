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
} from "@/lib/filters";
import { FacetLink } from "./FacetLink";

/**
 * The desktop sub-filter rail from README "02 Category listing".
 *
 * TODO(phase-2): the mockup's rail reads "Dogs / Cats / Dogs & cats /
 * Autoship, each with a count". None of those axes exist in
 * `products.json` — there is no species or autoship field on any of the
 * twelve products — so this renders the axes the shipped catalogue can
 * actually answer: shelf, price band, availability. Swap in the species
 * and autoship facets once the catalogue carries them.
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
    <div className="flex flex-col gap-6">
      <Group title="Shelf">
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

      <Group title="Price">
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

      <Group title="Availability">
        <FacetLink
          href={href({ inStockOnly: !filters.inStockOnly })}
          label="Open run"
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

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-1")}>
      <h3 className="mb-1 text-label font-medium uppercase text-ink-400">{title}</h3>
      {children}
    </section>
  );
}
