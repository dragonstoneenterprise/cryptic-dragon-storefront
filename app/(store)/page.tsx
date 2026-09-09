import Link from "next/link";
import { AnnouncementStrip } from "@/components/layout/AnnouncementStrip";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SearchField } from "@/components/layout/SearchField";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroPanel } from "@/components/home/HeroPanel";
import { NewsletterBlock } from "@/components/home/NewsletterBlock";
import { PullQuoteBand } from "@/components/home/PullQuoteBand";
import { ProductGrid } from "@/components/product/ProductGrid";
import { filterChipClass } from "@/components/ui/FilterChip";
import { PRODUCTS, SHELVES } from "@/lib/products";

export const metadata = {
  title: "Barkstash — dog and cat accessories",
  description:
    "Six shelves of dog and cat accessories — walking, toys, grooming, rest, apparel, feeding.",
};

/**
 * 01 Home.
 *
 * The two breakpoints run different compositions, and the README specifies
 * them separately:
 *
 *   Mobile — announcement strip, wordmark header, search field, shelf chip
 *   row, section heading, 2-col grid, bottom tab nav. It ends at the grid.
 *
 *   Desktop — the same up to the grid, then "three-up pull-quote band with
 *   vertical hairline dividers → about paragraph → newsletter block".
 *
 * Those last three are gated to `lg` because the mobile screen in the
 * handoff genuinely stops at the grid; this is the spec's composition, not
 * content hidden from small screens for want of room.
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

        {/* Desktop tail: pull-quote band → about paragraph → newsletter. */}
        <PageContainer className="hidden lg:block">
          <PullQuoteBand />

          <section className="flex max-w-[62ch] flex-col gap-3 py-14">
            <h2 className="font-display text-h2 text-ink-900">About the shop</h2>
            <p className="text-body text-ink-600">
              Barkstash is a dog and cat accessories shop built around six shelves — walking,
              toys, grooming, rest, apparel and feeding — with two things on each. That is the
              whole catalogue, and it is deliberate: a short list we can actually keep in stock,
              describe honestly and photograph properly beats a long one nobody can navigate.
            </p>
            <p className="text-body text-ink-600">
              Every product page lists what the thing is made of, what size it comes in and how to
              wash it. Where a run has closed, the page stays up and says so rather than
              disappearing. Prices are what they are; when something is discounted the old price
              stays visible next to the new one.
            </p>
          </section>

          <div className="border-t border-base-200 py-14">
            <NewsletterBlock />
          </div>
        </PageContainer>
      </main>

      <BottomTabNav />
    </>
  );
}
