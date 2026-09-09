import { OrdersView } from "@/components/account/OrdersView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Orders — Barkstash" };

export default function OrdersPage() {
  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Orders"
        backHref="/account"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-6 lg:pt-10">
          <div className="mx-auto w-full max-w-[720px]">
            <OrdersView />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
