import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterGroups } from "@/components/plp/FilterGroups";
import { MobileFilterSheet } from "@/components/plp/MobileFilterSheet";
import { Pagination } from "@/components/plp/Pagination";
import { QuickChipRow } from "@/components/plp/QuickChipRow";
import { SortControl } from "@/components/plp/SortControl";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filtersToHref,
  parseFilters,
  queryListing,
  serialiseFilters,
  type RawSearchParams,
} from "@/lib/filters";
import { LISTINGS, getListing } from "@/lib/products";

/**
 * 02 Product listing (PLP).
 *
 * A Server Component. It reads the URL, filters the catalogue and renders
 * the result; every filter and sort control below it is a link (or, for
 * sort, a select that pushes a link) built from this same state. That is
 * what makes README's "updates the URL query so the state is shareable and
 * back works" true by construction rather than by synchronisation.
 */

export function generateStaticParams() {
  return LISTINGS.map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = getListing(slug);
  return { title: listing ? `${listing.title} — Barkstash` : "Barkstash" };
}

function resultCount(total: number, q: string) {
  if (q) return `${total} result${total === 1 ? "" : "s"} for “${q}”`;
  return `${total} product${total === 1 ? "" : "s"}`;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const listing = getListing(slug);
  if (!listing) notFound();

  const filters = parseFilters(await searchParams);
  const result = queryListing(listing.slug, filters);
  const pathname = `/category/${listing.slug}`;
  const activeCount = activeFilterCount(filters);
  const stateKey = serialiseFilters(filters);
  const countLabel = resultCount(result.total, filters.q);

  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle={listing.title}
        backHref="/"
        mobileActions={["search", "cart"]}
        activeSlug={listing.slug}
        searchValue={filters.q}
      />

      <main className="flex flex-1 flex-col pb-8 lg:pb-14">
        {/* Mobile chip row — bleeds into the gutter, scrollbar hidden. */}
        <div className="border-b border-base-200 py-3 lg:hidden">
          <PageContainer>
            <QuickChipRow pathname={pathname} filters={filters} />
          </PageContainer>
        </div>

        <PageContainer className="flex flex-col gap-4 pt-4 lg:gap-6 lg:pt-7">
          {/* The visible h1 is desktop-only; mobile's title lives in the
              header bar as a <p>, so the document still needs one. */}
          <h1 className="sr-only-cd lg:hidden">{listing.title}</h1>

          <nav aria-label="Breadcrumb" className="hidden lg:block">
            <ol className="flex items-center gap-1.5 text-[13px] leading-[19px] text-ink-400">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-DEFAULT hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink-600">{listing.title}</li>
            </ol>
          </nav>

          <div className="hidden items-baseline justify-between gap-6 lg:flex">
            <h1 className="font-display text-h1 text-ink-900">{listing.title}</h1>
            <SortControl pathname={pathname} filters={filters} />
          </div>

          <div className="flex items-center justify-between gap-3 lg:hidden">
            <p className="min-w-0 truncate text-body-sm text-ink-400">{countLabel}</p>
            <div className="flex shrink-0 items-center gap-2">
              <MobileFilterSheet key={stateKey} activeCount={activeCount}>
                <FilterGroups pathname={pathname} filters={filters} facets={result.facets} />
              </MobileFilterSheet>
              <SortControl pathname={pathname} filters={filters} />
            </div>
          </div>

          <div className="flex gap-10">
            {/* README 02 desktop: left filter rail. */}
            <aside className="hidden w-[220px] shrink-0 lg:block" aria-label="Filters">
              <FilterGroups pathname={pathname} filters={filters} facets={result.facets} />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <p className="hidden text-body-sm text-ink-400 lg:block">{countLabel}</p>

              {result.products.length === 0 ? (
                <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-8">
                  <p className="text-[17px] font-semibold leading-6 text-ink-900">Nothing matches that combination.</p>
                  <p className="text-body text-ink-600">
                    Inventory turns over fast. Loosen a filter and try again.
                  </p>
                  <Link
                    href={filtersToHref(pathname, { ...EMPTY_FILTERS, sort: filters.sort })}
                    className="text-[14px] font-semibold leading-5 text-accent-600 transition-colors duration-DEFAULT hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                  >
                    Clear all filters
                  </Link>
                </div>
              ) : (
                <>
                  {/* Sold-out units stay in the grid, scrimmed, and their
                      PDP is still reachable — README 02 + Interactions. */}
                  <ProductGrid products={result.products} variant="plp" />
                  <Pagination
                    pathname={pathname}
                    filters={filters}
                    page={result.page}
                    pageCount={result.pageCount}
                  />
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </main>

      <BottomTabNav />
    </>
  );
}
