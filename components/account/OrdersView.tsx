"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";
import { formatOrderDate, listOrders, type AccountOrder } from "@/lib/account/orders";
import { AccountGate } from "./AccountGate";

/**
 * Order history.
 *
 * The list comes back already scoped by the `orders` SELECT policy — see
 * `lib/account/orders.ts` for why there is no `user_id` filter in the query.
 *
 * Orders placed as a guest are not here and cannot be: they carry no
 * `user_id`, so no policy matches them for anybody. That is stated on the
 * empty state rather than left as a mystery for someone who is sure they
 * bought something.
 */
export function OrdersView() {
  return (
    <AccountGate
      redirectTo="/account/orders"
      title="Sign in to see your orders"
      blurb="Orders placed while signed in show up here."
    >
      <SignedIn />
    </AccountGate>
  );
}

function SignedIn() {
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    void listOrders().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
        setOrders([]);
        return;
      }
      setOrders(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink-900">Orders.</h1>
        <p className="text-body text-ink-600">Everything you&apos;ve bought while signed in.</p>
      </div>

      {orders === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
      ) : error ? (
        <p
          role="alert"
          className="border border-base-300 bg-white p-4 text-[13px] leading-[18px] text-accent-600"
        >
          {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
          <h2 className="font-display text-h2 text-ink-900">No orders yet.</h2>
          <p className="text-body text-ink-600">
            Anything bought as a guest won&apos;t appear here — an order is only tied to an account
            when you&apos;re signed in at checkout.
          </p>
          <ButtonLink href="/category/all" className="mt-1">
            Start browsing
          </ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="flex items-center gap-4 border border-base-200 bg-white p-4 transition-colors duration-DEFAULT hover:bg-base-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900"
              >
                <LineThumb slug={order.lines[0]?.slug} />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[15px] font-semibold leading-5 text-ink-900">
                      #{order.number}
                    </span>
                    <span className="text-[13px] leading-[18px] text-ink-400">
                      {formatOrderDate(order.placedAt)}
                    </span>
                  </div>
                  <span className="truncate text-[13px] leading-[18px] text-ink-600">
                    {order.lines.map((l) => l.name).join(", ") || "—"}
                  </span>
                  <span className="text-[12px] leading-4 text-ink-400">
                    {order.totals.count} item{order.totals.count === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[15px] font-semibold leading-5 tabular-nums text-ink-900">
                    {formatPrice(order.totals.total)}
                  </span>
                  <ChevronRightIcon size={18} className="text-ink-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Falls back to a bare well when the slug is not in the catalogue — a
 * stored order outlives a product listing. */
function LineThumb({ slug }: { slug?: string }) {
  const product = slug ? getProductBySlug(slug) : undefined;
  if (!product) return <ImageWell aspectRatio="1/1" className="w-14 shrink-0" />;
  return <ProductPlateThumb product={product} className="w-14 shrink-0" />;
}
