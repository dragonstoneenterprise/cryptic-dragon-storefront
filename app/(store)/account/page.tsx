import { AccountHomeView } from "@/components/account/AccountHomeView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BottomTabNav } from "@/components/layout/BottomTabNav";

export const metadata = { title: "Account — Barkstash" };

/** 07 Account. The tab bar stays: this is a destination in the primary nav,
 * not a detour off one. */
export default function AccountPage() {
  return (
    <>
      <SiteHeader mobileKind="wordmark" mobileActions={["cart"]} />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-6 lg:pt-10">
          <div className="mx-auto w-full max-w-[720px]">
            <AccountHomeView />
          </div>
        </PageContainer>
      </main>

      <BottomTabNav />
    </>
  );
}
