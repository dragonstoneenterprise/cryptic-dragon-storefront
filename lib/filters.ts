import {
  isSoldOut,
  productsInShelf,
  SHELVES,
  type ListingSlug,
  type Product,
} from "./products";
import { percentOff } from "./format";

/**
 * Listing filter/sort state, mirrored to the URL.
 *
 * The URL is the single source of truth: there is no client filter store.
 * The listing page is a Server Component that parses `searchParams` here
 * and renders the already-filtered grid; the chip row, the rail and the
 * sort control are thin clients that push a new URL. That makes filter
 * state shareable and the back button work for free (README
 * "Interactions": "Filter/sort: updates the URL query so state is
 * shareable and back works").
 *
 * TODO(phase-2): the desktop listing's sub-filter rail in the mockups is
 * "Dogs / Cats / Dogs & cats / Autoship, each with a count". None of those
 * axes exist in `products.json` — there is no species or autoship field on
 * any of the twelve products — so this phase filters on the axes the
 * shipped data can actually answer: shelf, price band, and availability.
 * Wire the species/autoship facets when the catalogue carries them.
 */

export type SortId = "featured" | "price-asc" | "price-desc" | "savings";

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "featured", label: "Shelf order" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "savings", label: "Biggest saving" },
];

export const DEFAULT_SORT: SortId = "featured";

export interface PriceBucket {
  id: string;
  label: string;
  min: number;
  /** Exclusive upper bound; omitted means open-ended. */
  max?: number;
}

/** Bands drawn around the real catalogue, which runs $12–$58. */
export const PRICE_BUCKETS: PriceBucket[] = [
  { id: "under-20", label: "Under $20", min: 0, max: 20 },
  { id: "20-40", label: "$20 – $40", min: 20, max: 40 },
  { id: "40-plus", label: "$40+", min: 40 },
];

export const PAGE_SIZE = 12;

export interface Filters {
  /** Free-text query. The header and homepage both carry a real search
   * field ("Search 12 products"), so the query rides the same URL-mirrored
   * mechanism as everything else rather than becoming a second kind of
   * state. */
  q: string;
  shelf: string[];
  price: string[];
  /** Hide "Closed" plates. Off by default — README is explicit that
   * sold-out items stay in the grid, scrimmed, not filtered out. */
  inStockOnly: boolean;
  sort: SortId;
  page: number;
}

/** Next.js hands `searchParams` through as string | string[] | undefined. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads a repeatable param that we serialise comma-separated, but also
 * tolerates the `?shelf=toys&shelf=rest` form so hand-edited URLs work. */
function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseFilters(params: RawSearchParams): Filters {
  const sortRaw = first(params.sort);
  const sort = SORT_OPTIONS.some((o) => o.id === sortRaw) ? (sortRaw as SortId) : DEFAULT_SORT;

  const pageRaw = Number(first(params.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  return {
    q: (first(params.q) ?? "").trim(),
    shelf: list(params.shelf).filter((id) => SHELVES.some((s) => s.slug === id)),
    price: list(params.price).filter((id) => PRICE_BUCKETS.some((b) => b.id === id)),
    inStockOnly: first(params.stock) === "in",
    sort,
    page,
  };
}

/** Serialises filters back to a query string. Defaults are omitted so a
 * pristine listing URL stays clean. */
export function serialiseFilters(filters: Filters): string {
  const q = new URLSearchParams();
  if (filters.q) q.set("q", filters.q);
  if (filters.shelf.length) q.set("shelf", filters.shelf.join(","));
  if (filters.price.length) q.set("price", filters.price.join(","));
  if (filters.inStockOnly) q.set("stock", "in");
  if (filters.sort !== DEFAULT_SORT) q.set("sort", filters.sort);
  if (filters.page > 1) q.set("page", String(filters.page));
  return q.toString();
}

/** Builds `pathname?query`, dropping the `?` when there is nothing to say. */
export function filtersToHref(pathname: string, filters: Filters): string {
  const q = serialiseFilters(filters);
  return q ? `${pathname}?${q}` : pathname;
}

export function toggleInList<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function inBucket(product: Product, bucket: PriceBucket) {
  return product.price >= bucket.min && (bucket.max === undefined || product.price < bucket.max);
}

function matchesPrice(product: Product, bucketIds: string[]) {
  if (!bucketIds.length) return true;
  return bucketIds.some((id) => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === id);
    return bucket ? inBucket(product, bucket) : false;
  });
}

function sortProducts(products: Product[], sort: SortId): Product[] {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "savings":
      return copy.sort((a, b) => {
        const sa = a.savings ?? 0;
        const sb = b.savings ?? 0;
        if (sb !== sa) return sb - sa;
        return (percentOff(b.price, b.compareAtPrice) ?? 0) - (percentOff(a.price, a.compareAtPrice) ?? 0);
      });
    case "featured":
    default:
      // Shelf order is significant and is already PRODUCTS order.
      return copy;
  }
}

export interface FacetOption {
  id: string;
  label: string;
  count: number;
}

export interface ListingResult {
  products: Product[];
  /** Count after filtering, before pagination. */
  total: number;
  page: number;
  pageCount: number;
  facets: {
    shelf: FacetOption[];
    price: FacetOption[];
    inStock: number;
  };
}

/**
 * Sold-out plates are deliberately NOT filtered out by default (README
 * "02": "Sold-out items stay in the grid, scrimmed; they are not filtered
 * out") but they do sort last, so a shopper scanning the grid meets live
 * stock first.
 */
export function queryListing(slug: ListingSlug, filters: Filters): ListingResult {
  const scope = productsInShelf(slug);

  const needle = filters.q.toLowerCase();
  const filtered = scope.filter((p) => {
    if (needle && !`${p.name} ${p.shelfName} ${p.specs.join(" ")}`.toLowerCase().includes(needle)) {
      return false;
    }
    if (filters.shelf.length && !filters.shelf.includes(p.shelf)) return false;
    if (!matchesPrice(p, filters.price)) return false;
    if (filters.inStockOnly && isSoldOut(p)) return false;
    return true;
  });

  const sorted = sortProducts(filtered, filters.sort).sort(
    (a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)),
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const products = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Facet counts are computed against the listing scope, not the filtered
  // set, so a shopper can see what turning a filter on would give them.
  const facets = {
    shelf: SHELVES.map((s) => ({
      id: s.slug,
      label: s.name,
      count: scope.filter((p) => p.shelf === s.slug).length,
    })).filter((option) => option.count > 0),
    price: PRICE_BUCKETS.map((b) => ({
      id: b.id,
      label: b.label,
      count: scope.filter((p) => inBucket(p, b)).length,
    })),
    inStock: scope.filter((p) => !isSoldOut(p)).length,
  };

  return { products, total: sorted.length, page, pageCount, facets };
}

export function activeFilterCount(filters: Filters) {
  return filters.shelf.length + filters.price.length + (filters.inStockOnly ? 1 : 0);
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  shelf: [],
  price: [],
  inStockOnly: false,
  sort: DEFAULT_SORT,
  page: 1,
};
