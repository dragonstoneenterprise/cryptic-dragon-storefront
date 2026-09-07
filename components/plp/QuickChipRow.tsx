import Link from "next/link";
import { filterChipClass } from "@/components/ui/FilterChip";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filtersToHref,
  toggleInList,
  type Filters,
} from "@/lib/filters";
import { SHELVES } from "@/lib/products";

/**
 * The mobile chip row. README "Interactions": "Shelf chips: selecting a
 * shelf re-slices every grid on the page. 'All' is the default and
 * flattens all six shelves in CATS order."
 *
 * README "Filter chip": chip rows scroll horizontally on mobile, bleeding
 * into the 16px gutter, scrollbar hidden.
 */
export function QuickChipRow({ pathname, filters }: { pathname: string; filters: Filters }) {
  const href = (patch: Partial<Filters>) =>
    filtersToHref(pathname, { ...filters, ...patch, page: 1 });

  const chips = [
    {
      key: "all",
      label: "All",
      href: filtersToHref(pathname, { ...EMPTY_FILTERS, q: filters.q, sort: filters.sort }),
      selected: activeFilterCount(filters) === 0,
    },
    ...SHELVES.map((shelf) => ({
      key: shelf.slug,
      label: shelf.name,
      href: href({ shelf: toggleInList(filters.shelf, shelf.slug) }),
      selected: filters.shelf.includes(shelf.slug),
    })),
  ];

  return (
    <div className="scrollbar-hidden -mx-4 overflow-x-auto px-4 py-1.5 sm:-mx-6 sm:px-6">
      <div className="flex w-max gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            scroll={false}
            aria-current={chip.selected ? "true" : undefined}
            className={filterChipClass({ selected: chip.selected })}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
