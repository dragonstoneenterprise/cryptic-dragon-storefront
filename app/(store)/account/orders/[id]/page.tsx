import { OrderDetailView } from "@/components/account/OrderDetailView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Order — Barkstash" };

/**
 * One order.
 *
 * The id is passed straight through to the client view, which fetches the row
 * with the user's own token. Nothing is looked up here, and nothing needs to
 * be authorised here: the `orders` SELECT policy is what decides whether this
 * id resolves to a row for this person. An id belonging to someone else
 * returns nothing and renders the not-found state.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Order"
        backHref="/account/orders"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-6 lg:pt-10">
          <OrderDetailView orderId={id} />
        </PageContainer>
      </main>
    </>
  );
}
