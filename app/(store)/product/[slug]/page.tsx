import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PdpBuyPanel } from "@/components/pdp/PdpBuyPanel";
import { ProductGallery } from "@/components/pdp/ProductGallery";
import { deliveryDate } from "@/lib/dates";
import { PRODUCTS, getShelf, getProductBySlug } from "@/lib/products";

/**
 * 03 Product detail (PDP).
 *
 * Server Component for the data and the static furniture; the buy panel is
 * the one client island, because it owns the only state on the page
 * (selected size, quantity).
 *
 * TODO(phase-2): the mockup's desktop layout is a `96px 1fr 400px` grid —
 * thumbnail rail, main photo, buy panel — and the mobile screen carries a
 * 5-dot pagination, an autoship checkbox with its discounted monthly price
 * and a description block. The handoff supplies one photograph per product
 * and no autoship or long-form copy fields, so this route currently
 * renders the photo, the buy panel and the spec bullets only. Screen
 * composition is Phase 2.
 */

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Cryptic Dragon" };
  return {
    title: `${product.name} — Cryptic Dragon`,
    description: product.specs.join(" · "),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const shelf = getShelf(product.shelf);
  const deliveryBy = deliveryDate();

  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle={product.name}
        mobileActions={["wishlist", "cart"]}
        mobileHeight={52}
        activeSlug={product.shelf}
      />

      {/* pb clears the fixed mobile add-to-cart bar. */}
      <main className="flex flex-1 flex-col pb-[112px] lg:pb-14">
        <PageContainer className="hidden pt-6 lg:block">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-body-sm text-ink-400">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-DEFAULT hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/category/${product.shelf}`}
                  className="transition-colors duration-DEFAULT hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
                >
                  {shelf?.name ?? product.shelfName}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink-600">{product.name}</li>
            </ol>
          </nav>
        </PageContainer>

        {/* The mobile photo field runs edge to edge; the desktop one sits
            in the content column. */}
        <div className="lg:hidden">
          <ProductGallery product={product} />
        </div>

        <PageContainer className="pt-4 lg:pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="hidden min-w-0 flex-1 lg:block">
              <ProductGallery product={product} />
            </div>

            <div className="w-full lg:w-[400px] lg:shrink-0">
              <PdpBuyPanel product={product} deliveryBy={deliveryBy} />
            </div>
          </div>
        </PageContainer>
      </main>
    </>
  );
}
