import { ConfirmationView } from "@/components/confirmation/ConfirmationView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Order confirmed — Barkstash" };

/** 06 Order confirmation. */
export default function OrderConfirmationPage() {
  return (
    <>
      <SiteHeader mobileKind="wordmark-center" mobileActions={[]} />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-8 lg:pt-10">
          <ConfirmationView />
        </PageContainer>
      </main>
    </>
  );
}
