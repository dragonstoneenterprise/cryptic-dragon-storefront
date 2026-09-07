import Link from "next/link";
import { AnnouncementStrip } from "@/components/layout/AnnouncementStrip";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SearchField } from "@/components/layout/SearchField";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroPanel } from "@/components/home/HeroPanel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { filterChipClass } from "@/components/ui/FilterChip";
import { PRODUCTS, SHELVES } from "@/lib/products";

export const metadata = {
  title: "Cryptic Dragon — dog and cat accessories",
  description:
    "Six shelves of dog and cat accessories — walking, toys, grooming, rest, apparel, feeding.",
};

/**
 * 01 Home.
 *
 * TODO(phase-2): the desktop composition in the mockup also carries the
 * three-up pull-quote band with vertical hairline dividers, the about
 * paragraph and the 420px newsletter block. Those are screen composition,
 * not primitives, and belong to the Phase 2 screen build.
 */
export default function HomePage() {
  return (
    <>
      <AnnouncementStrip />
      <SiteHeader mobileKind="wordmark" mobileActions={["search", "cart"]} />

      <main className="flex flex-1 flex-col gap-6 pb-8 lg:gap-14 lg:pb-14">
        <HeroPanel />

        {/* The desktop header already carries a search field. */}
        <PageContainer className="lg:hidden">
          <SearchField />
        </PageContainer>

        {/* Shelf chips. "All" is the default and flattens the six shelves
            in SHELVES order. */}
        <div className="scrollbar-hidden overflow-x-auto lg:hidden">
          <div className="flex w-max gap-2 px-4 py-1.5 sm:px-6">
            <Link href="/category/all" className={filterChipClass({ selected: true })}>
              All
            </Link>
            {SHELVES.map((shelf) => (
              <Link
                key={shelf.slug}
                href={`/category/${shelf.slug}`}
                className={filterChipClass()}
              >
                {shelf.name}
              </Link>
            ))}
          </div>
        </div>

        <PageContainer>
          <section className="flex flex-col gap-4 lg:gap-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-h2 text-ink-900 lg:text-h1">The shelves</h2>
              <Link
                href="/category/all"
                className="shrink-0 text-body-sm font-semibold text-accent-600 transition-colors duration-DEFAULT hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                See all
              </Link>
            </div>

            <ProductGrid products={PRODUCTS} />
          </section>
        </PageContainer>
      </main>

      <BottomTabNav />
    </>
  );
}
