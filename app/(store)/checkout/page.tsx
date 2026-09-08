import { CheckoutView } from "@/components/checkout/CheckoutView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Checkout — Cryptic Dragon" };

/** 05 Checkout. One page, no wizard. */
export default function CheckoutPage() {
  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Checkout"
        backHref="/cart"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="flex flex-col gap-5 pt-5 lg:gap-7 lg:pt-8">
          <div className="hidden items-baseline justify-between gap-4 lg:flex">
            <h1 className="font-display text-h1 text-ink-900">Checkout</h1>
            <p className="text-body-sm text-ink-400">Secure checkout</p>
          </div>
          <h1 className="sr-only-cd lg:hidden">Checkout</h1>

          <CheckoutView />
        </PageContainer>
      </main>
    </>
  );
}
