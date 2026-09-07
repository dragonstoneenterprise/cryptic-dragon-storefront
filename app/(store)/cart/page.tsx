import { CartPageView } from "@/components/cart/CartPageView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Cart — Cryptic Dragon" };

/**
 * 04 Cart, page form.
 *
 * A Server Component shell — header, gutter, heading — around one client
 * view, because the cart is the only client state in the build and there
 * is nothing else on this route for the server to render.
 */
export default function CartPage() {
  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Cart"
        backHref="/category/all"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="flex flex-col gap-5 pt-5 lg:gap-7 lg:pt-8">
          {/* The mobile bar already says "Cart"; repeating it as a visible
              page heading below it is just the same word twice. Same split
              the PLP and checkout use. */}
          <h1 className="sr-only-cd lg:hidden">Cart</h1>
          <h1 className="hidden text-h1 text-ink-900 lg:block">Cart</h1>
          <CartPageView />
        </PageContainer>
      </main>
    </>
  );
}
