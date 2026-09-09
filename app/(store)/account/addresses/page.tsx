import { AddressesView } from "@/components/account/AddressesView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Addresses — Barkstash" };

export default function AddressesPage() {
  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Addresses"
        backHref="/account"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-6 lg:pt-10">
          <div className="mx-auto w-full max-w-[720px]">
            <AddressesView />
          </div>
        </PageContainer>
      </main>
    </>
  );
}
