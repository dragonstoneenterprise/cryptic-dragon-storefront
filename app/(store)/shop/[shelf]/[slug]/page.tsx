import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PdpBuyPanel } from "@/components/pdp/PdpBuyPanel";
import { ProductGallery } from "@/components/pdp/ProductGallery";
import { deliveryDate } from "@/lib/dates";
import { PRODUCTS, getShelf, getProductBySlug, hasRail } from "@/lib/products";

/**
 * 03 Product detail (PDP).
 *
 * Route shape is the README's: "Slug — the URL segment; product routes are
 * `/shop/[shelf]/[slug]`." The shelf segment is validated against the
 * product's own shelf rather than ignored, so `/shop/toys/cooling-mat`
 * 404s instead of serving the Rest product from a Toys URL — one canonical
 * address per product, no duplicate content.
 *
 * Server Component for the data and the static furniture; the gallery and
 * the buy panel are the client islands, because they own the only state on
 * the page (selected photo, size, quantity).
 *
 * Desktop composition is the README's `96px 1fr 400px` grid — thumbnail
 * rail, main photo, buy panel. The 96px rail column is only laid down when
 * there is more than one photograph to put in it; see the note in
 * ProductGallery on why an empty rail is not shipped. With the catalogue's
 * one shot per product that resolves to `1fr 400px` today and widens to the
 * full three-column template the moment a second photo lands.
 */

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ shelf: product.shelf, slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shelf: string; slug: string }>;
}) {
  const { shelf, slug } = await params;
  const product = getProductBySlug(slug);
  if (!product || product.shelf !== shelf) return { title: "Barkstash" };
  return {
    title: `${product.name} — Barkstash`,
    description: product.specs.join(" · "),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ shelf: string; slug: string }>;
}) {
  const { shelf: shelfSegment, slug } = await params;
  const product = getProductBySlug(slug);
  if (!product || product.shelf !== shelfSegment) notFound();

  const shelf = getShelf(product.shelf);
  const deliveryBy = deliveryDate();
  const rail = hasRail(product);

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

        {/* The mobile photo field runs edge to edge above the panel; the
            desktop one is a column of the grid below. Two mounts rather
            than one repositioned node, because the mobile field is a fixed
            330px bleed and the desktop one is a 3/4 plate inside the
            content column. */}
        {/* The gallery's mobile field bleeds with `-mx-4 sm:-mx-6`, which
            only lands edge-to-edge if it is cancelling a container's
            gutter. Mounted bare under <main> it would hang 16px off the
            left of the viewport instead, so it goes inside a
            PageContainer like every other block on the page. */}
        <PageContainer className="lg:hidden">
          <ProductGallery product={product} />
        </PageContainer>

        <PageContainer className="pt-4 lg:pt-6">
          {/* README 03 desktop: `96px 1fr 400px` — rail, photo, buy panel.
              ProductGallery emits the rail and the field as sibling grid
              children, so they land in the first columns directly; the
              `contents` wrapper exists only to keep them out of the mobile
              flow without introducing a box between them and the grid. */}
          <div
            className="flex flex-col gap-6 lg:grid lg:items-start lg:gap-10"
            style={{
              gridTemplateColumns: rail ? "96px minmax(0,1fr) 400px" : "minmax(0,1fr) 400px",
            }}
          >
            <div className="hidden lg:contents">
              <ProductGallery product={product} />
            </div>

            <div className="w-full">
              <PdpBuyPanel product={product} deliveryBy={deliveryBy} />
            </div>
          </div>
        </PageContainer>
      </main>
    </>
  );
}
